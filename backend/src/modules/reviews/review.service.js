const mongoose = require("mongoose");

const Review = require("./review.model");
const Product = require("../catalog/product.model");
const Order = require("../orders/order.model");

const createServiceError = (
  message,
  statusCode = 400
) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const validateObjectId = (
  value,
  message
) => {
  if (!mongoose.isValidObjectId(value)) {
    throw createServiceError(
      message,
      400
    );
  }
};

const findDeliveredPurchase = async ({
  tenantId,
  customerId,
  productId,
  orderId = null,
}) => {
  const filter = {
    tenantId,
    customerId,
    status: "DELIVERED",
    "items.productId": productId,
  };

  if (orderId) {
    filter._id = orderId;
  }

  return Order.findOne(filter)
    .sort({
      createdAt: -1,
    });
};

const createReview = async ({
  tenantId,
  customerId,
  productId,
  rating,
  title = "",
  comment = "",
  images = [],
  orderId = null,
  variantId = null,
}) => {
  validateObjectId(
    productId,
    "Invalid product ID"
  );

  if (
    orderId &&
    !mongoose.isValidObjectId(orderId)
  ) {
    throw createServiceError(
      "Invalid order ID",
      400
    );
  }

  if (
    variantId &&
    !mongoose.isValidObjectId(variantId)
  ) {
    throw createServiceError(
      "Invalid variant ID",
      400
    );
  }

  const numericRating = Number(rating);

  if (
    !Number.isInteger(numericRating) ||
    numericRating < 1 ||
    numericRating > 5
  ) {
    throw createServiceError(
      "Rating must be an integer between 1 and 5",
      400
    );
  }

  const product = await Product.findOne({
    _id: productId,
    tenantId,
    status: {
      $ne: "ARCHIVED",
    },
  });

  if (!product) {
    throw createServiceError(
      "Product not found",
      404
    );
  }

  const existingReview =
    await Review.findOne({
      tenantId,
      productId,
      customerId,
    });

  if (existingReview) {
    throw createServiceError(
      "You have already reviewed this product",
      409
    );
  }

  const deliveredOrder =
    await findDeliveredPurchase({
      tenantId,
      customerId,
      productId,
      orderId,
    });

  if (!deliveredOrder) {
    throw createServiceError(
      "You can review a product only after a delivered purchase",
      403
    );
  }

  const purchasedItem =
    deliveredOrder.items.find(
      (item) =>
        String(item.productId) ===
        String(productId)
    );

  if (!purchasedItem) {
    throw createServiceError(
      "Product was not found in the delivered order",
      403
    );
  }

  let finalVariantId =
    variantId || null;

  if (
    finalVariantId &&
    purchasedItem.variantId &&
    String(finalVariantId) !==
      String(purchasedItem.variantId)
  ) {
    throw createServiceError(
      "Selected variant was not purchased in this order",
      403
    );
  }

  if (
    !finalVariantId &&
    purchasedItem.variantId
  ) {
    finalVariantId =
      purchasedItem.variantId;
  }

  const review = await Review.create({
    tenantId,
    productId,
    variantId: finalVariantId,
    customerId,
    orderId: deliveredOrder._id,
    rating: numericRating,
    title: String(title || "").trim(),
    comment: String(comment || "").trim(),
    images: Array.isArray(images)
      ? images
      : [],
    verifiedPurchase: true,
    status: "PUBLISHED",
  });

  return review;
};

const getProductReviews = async ({
  tenantId,
  productId,
  page = 1,
  limit = 10,
}) => {
  validateObjectId(
    productId,
    "Invalid product ID"
  );

  const pageNumber = Math.max(
    Number(page) || 1,
    1
  );

  const limitNumber = Math.min(
    Math.max(Number(limit) || 10, 1),
    100
  );

  const filter = {
    tenantId,
    productId,
    status: "PUBLISHED",
  };

  /*
   * Mongoose automatically casts values for
   * find() and countDocuments(), but aggregation
   * pipelines do not reliably cast string IDs.
   *
   * Convert tenantId and productId explicitly
   * before using them inside $match.
   */
  const aggregationFilter = {
    tenantId: new mongoose.Types.ObjectId(
      String(tenantId)
    ),
    productId: new mongoose.Types.ObjectId(
      String(productId)
    ),
    status: "PUBLISHED",
  };

  const [
    reviews,
    total,
    ratingSummary,
  ] = await Promise.all([
    Review.find(filter)
      .populate(
        "customerId",
        "name"
      )
      .sort({
        createdAt: -1,
      })
      .skip(
        (pageNumber - 1) *
          limitNumber
      )
      .limit(limitNumber),

    Review.countDocuments(filter),

    Review.aggregate([
      {
        $match: aggregationFilter,
      },
      {
        $group: {
          _id: null,

          averageRating: {
            $avg: "$rating",
          },

          totalReviews: {
            $sum: 1,
          },

          rating1: {
            $sum: {
              $cond: [
                {
                  $eq: ["$rating", 1],
                },
                1,
                0,
              ],
            },
          },

          rating2: {
            $sum: {
              $cond: [
                {
                  $eq: ["$rating", 2],
                },
                1,
                0,
              ],
            },
          },

          rating3: {
            $sum: {
              $cond: [
                {
                  $eq: ["$rating", 3],
                },
                1,
                0,
              ],
            },
          },

          rating4: {
            $sum: {
              $cond: [
                {
                  $eq: ["$rating", 4],
                },
                1,
                0,
              ],
            },
          },

          rating5: {
            $sum: {
              $cond: [
                {
                  $eq: ["$rating", 5],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);

  const summary =
    ratingSummary[0] || {
      averageRating: 0,
      totalReviews: 0,
      rating1: 0,
      rating2: 0,
      rating3: 0,
      rating4: 0,
      rating5: 0,
    };

  return {
    reviews,

    summary: {
      averageRating: Number(
        Number(
          summary.averageRating || 0
        ).toFixed(2)
      ),

      totalReviews:
        summary.totalReviews || 0,

      distribution: {
        1: summary.rating1 || 0,
        2: summary.rating2 || 0,
        3: summary.rating3 || 0,
        4: summary.rating4 || 0,
        5: summary.rating5 || 0,
      },
    },

    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(
        total / limitNumber
      ),
    },
  };
};

const getCustomerReviews = async ({
  tenantId,
  customerId,
  page = 1,
  limit = 20,
}) => {
  const pageNumber = Math.max(
    Number(page) || 1,
    1
  );

  const limitNumber = Math.min(
    Math.max(Number(limit) || 20, 1),
    100
  );

  const filter = {
    tenantId,
    customerId,
  };

  const [
    reviews,
    total,
  ] = await Promise.all([
    Review.find(filter)
      .populate(
        "productId",
        "name slug images price"
      )
      .sort({
        createdAt: -1,
      })
      .skip(
        (pageNumber - 1) *
          limitNumber
      )
      .limit(limitNumber),

    Review.countDocuments(filter),
  ]);

  return {
    reviews,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(
        total / limitNumber
      ),
    },
  };
};

const updateCustomerReview = async ({
  tenantId,
  customerId,
  reviewId,
  rating,
  title,
  comment,
  images,
}) => {
  validateObjectId(
    reviewId,
    "Invalid review ID"
  );

  const review =
    await Review.findOne({
      _id: reviewId,
      tenantId,
      customerId,
    });

  if (!review) {
    throw createServiceError(
      "Review not found",
      404
    );
  }

  if (
    rating !== undefined
  ) {
    const numericRating =
      Number(rating);

    if (
      !Number.isInteger(
        numericRating
      ) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      throw createServiceError(
        "Rating must be an integer between 1 and 5",
        400
      );
    }

    review.rating =
      numericRating;
  }

  if (
    title !== undefined
  ) {
    review.title =
      String(title).trim();
  }

  if (
    comment !== undefined
  ) {
    review.comment =
      String(comment).trim();
  }

  if (
    images !== undefined
  ) {
    if (!Array.isArray(images)) {
      throw createServiceError(
        "Images must be an array",
        400
      );
    }

    review.images =
      images;
  }

  /*
   * Edited reviews return to moderation
   * so future moderation rules can be applied.
   */
  review.status = "PENDING";
  review.moderatedBy = null;
  review.moderatedAt = null;
  review.moderationReason = "";

  await review.save();

  return review;
};

const deleteCustomerReview = async ({
  tenantId,
  customerId,
  reviewId,
}) => {
  validateObjectId(
    reviewId,
    "Invalid review ID"
  );

  const review =
    await Review.findOneAndDelete({
      _id: reviewId,
      tenantId,
      customerId,
    });

  if (!review) {
    throw createServiceError(
      "Review not found",
      404
    );
  }

  return review;
};

const getTenantReviews = async ({
  tenantId,
  page = 1,
  limit = 20,
  status,
}) => {
  const pageNumber = Math.max(
    Number(page) || 1,
    1
  );

  const limitNumber = Math.min(
    Math.max(Number(limit) || 20, 1),
    100
  );

  const filter = {
    tenantId,
  };

  if (status) {
    const allowedStatuses = [
      "PENDING",
      "PUBLISHED",
      "REJECTED",
    ];

    if (
      !allowedStatuses.includes(
        status
      )
    ) {
      throw createServiceError(
        "Invalid review status",
        400
      );
    }

    filter.status = status;
  }

  const [
    reviews,
    total,
  ] = await Promise.all([
    Review.find(filter)
      .populate(
        "productId",
        "name slug images"
      )
      .populate(
        "customerId",
        "name email"
      )
      .sort({
        createdAt: -1,
      })
      .skip(
        (pageNumber - 1) *
          limitNumber
      )
      .limit(limitNumber),

    Review.countDocuments(filter),
  ]);

  return {
    reviews,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(
        total / limitNumber
      ),
    },
  };
};

const moderateReview = async ({
  tenantId,
  reviewId,
  status,
  performedBy,
  moderationReason = "",
}) => {
  validateObjectId(
    reviewId,
    "Invalid review ID"
  );

  const allowedStatuses = [
    "PUBLISHED",
    "REJECTED",
  ];

  if (
    !allowedStatuses.includes(
      status
    )
  ) {
    throw createServiceError(
      "Moderation status must be PUBLISHED or REJECTED",
      400
    );
  }

  const review =
    await Review.findOne({
      _id: reviewId,
      tenantId,
    });

  if (!review) {
    throw createServiceError(
      "Review not found",
      404
    );
  }

  review.status = status;
  review.moderatedBy =
    performedBy;
  review.moderatedAt =
    new Date();
  review.moderationReason =
    String(
      moderationReason || ""
    ).trim();

  await review.save();

  return review;
};

const getTenantReviewById = async ({
  tenantId,
  reviewId,
}) => {
  validateObjectId(
    reviewId,
    "Invalid review ID"
  );

  const review =
    await Review.findOne({
      _id: reviewId,
      tenantId,
    })
      .populate(
        "productId",
        "name slug images"
      )
      .populate(
        "customerId",
        "name email"
      )
      .populate(
        "orderId",
        "orderNumber status createdAt"
      );

  if (!review) {
    throw createServiceError(
      "Review not found",
      404
    );
  }

  return review;
};

module.exports = {
  createReview,
  getProductReviews,
  getCustomerReviews,
  updateCustomerReview,
  deleteCustomerReview,
  getTenantReviews,
  getTenantReviewById,
  moderateReview,
};