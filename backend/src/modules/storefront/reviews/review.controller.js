const {
  createReview,
  getProductReviews,
  getCustomerReviews,
  updateCustomerReview,
  deleteCustomerReview,
  getTenantReviews,
  getTenantReviewById,
  moderateReview,
} = require("./review.service");

const create = async (
  req,
  res,
  next
) => {
  try {
    const review =
      await createReview({
        tenantId: req.tenantId,
        customerId: req.user._id,
        productId:
          req.body.productId,
        variantId:
          req.body.variantId,
        orderId:
          req.body.orderId,
        rating:
          req.body.rating,
        title:
          req.body.title,
        comment:
          req.body.comment,
        images:
          req.body.images,
      });

    res.status(201).json({
      success: true,
      message:
        "Review created successfully",
      review,
    });
  } catch (error) {
    next(error);
  }
};

const getProduct = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await getProductReviews({
        tenantId: req.tenantId,
        productId:
          req.params.productId,
        page:
          req.query.page,
        limit:
          req.query.limit,
      });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

const getMine = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await getCustomerReviews({
        tenantId: req.tenantId,
        customerId: req.user._id,
        page:
          req.query.page,
        limit:
          req.query.limit,
      });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

const updateMine = async (
  req,
  res,
  next
) => {
  try {
    const review =
      await updateCustomerReview({
        tenantId: req.tenantId,
        customerId:
          req.user._id,
        reviewId:
          req.params.id,
        rating:
          req.body.rating,
        title:
          req.body.title,
        comment:
          req.body.comment,
        images:
          req.body.images,
      });

    res.status(200).json({
      success: true,
      message:
        "Review updated successfully",
      review,
    });
  } catch (error) {
    next(error);
  }
};

const deleteMine = async (
  req,
  res,
  next
) => {
  try {
    await deleteCustomerReview({
      tenantId: req.tenantId,
      customerId:
        req.user._id,
      reviewId:
        req.params.id,
    });

    res.status(200).json({
      success: true,
      message:
        "Review deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getAdminReviews = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await getTenantReviews({
        tenantId: req.tenantId,
        page:
          req.query.page,
        limit:
          req.query.limit,
        status:
          req.query.status,
      });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

const getAdminReview = async (
  req,
  res,
  next
) => {
  try {
    const review =
      await getTenantReviewById({
        tenantId: req.tenantId,
        reviewId:
          req.params.id,
      });

    res.status(200).json({
      success: true,
      review,
    });
  } catch (error) {
    next(error);
  }
};

const moderate = async (
  req,
  res,
  next
) => {
  try {
    const review =
      await moderateReview({
        tenantId: req.tenantId,
        reviewId:
          req.params.id,
        status:
          req.body.status,
        performedBy:
          req.user._id,
        moderationReason:
          req.body.moderationReason,
      });

    res.status(200).json({
      success: true,
      message:
        "Review moderation updated successfully",
      review,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  getProduct,
  getMine,
  updateMine,
  deleteMine,
  getAdminReviews,
  getAdminReview,
  moderate,
};