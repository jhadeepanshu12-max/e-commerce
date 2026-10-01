const Tenant = require("../tenants/tenant.model");
const Category = require("../catalog/category.model");
const Product = require("../catalog/product.model");

const getTenant = async (tenantSlug) => {
  if (!tenantSlug) {
    const error = new Error(
      "Store slug is required"
    );

    error.statusCode = 400;
    throw error;
  }

  const normalizedSlug =
    tenantSlug.trim().toLowerCase();

  const tenant =
    await Tenant.findOne({
      slug: normalizedSlug,
      status: "ACTIVE",
    }).select(
      "_id name slug businessType branding"
    );

  if (!tenant) {
    const error = new Error(
      "Store not found"
    );

    error.statusCode = 404;
    throw error;
  }

  return tenant;
};

/*
 * Remove internal/private fields from
 * product variants before sending them
 * to the public storefront.
 */
const sanitizeVariants = (variants = []) => {
  return variants.map((variant) => {
    const safeVariant = {
      ...variant,
    };

    delete safeVariant.costPrice;

    return safeVariant;
  });
};

/*
 * Sanitize a product before returning it
 * from a public storefront endpoint.
 */
const sanitizeProduct = (product) => {
  if (!product) {
    return null;
  }

  const productData =
    typeof product.toObject === "function"
      ? product.toObject()
      : {
          ...product,
        };

  if (Array.isArray(productData.variants)) {
    productData.variants =
      sanitizeVariants(
        productData.variants
      );
  }

  return productData;
};

/*
 * GET /api/v1/storefront/:tenantSlug
 *
 * Public storefront information.
 */
const getStorefront = async (
  req,
  res,
  next
) => {
  try {
    const tenant =
      await getTenant(
        req.params.tenantSlug
      );

    return res.status(200).json({
      success: true,
      data: {
        tenant,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * GET /api/v1/storefront/:tenantSlug/categories
 *
 * Public active categories for a tenant.
 */
const getPublicCategories = async (
  req,
  res,
  next
) => {
  try {
    const tenant =
      await getTenant(
        req.params.tenantSlug
      );

    const categories =
      await Category.find({
        tenantId: tenant._id,
        isActive: true,
      })
        .select(
          "_id name slug description imageUrl parentId sortOrder"
        )
        .sort({
          sortOrder: 1,
          name: 1,
        })
        .lean();

    return res.status(200).json({
      success: true,
      data: {
        categories,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * GET /api/v1/storefront/:tenantSlug/products
 *
 * Public product listing.
 */
const getPublicProducts = async (
  req,
  res,
  next
) => {
  try {
    const tenant =
      await getTenant(
        req.params.tenantSlug
      );

    const {
      page = 1,
      limit = 24,
      search = "",
      categoryId,
      featured,
    } = req.query;

    const currentPage = Math.max(
      Number(page) || 1,
      1
    );

    const currentLimit = Math.min(
      Math.max(
        Number(limit) || 24,
        1
      ),
      100
    );

    const filter = {
      tenantId: tenant._id,
      status: "ACTIVE",
    };

    const normalizedSearch =
      typeof search === "string"
        ? search.trim()
        : "";

    if (normalizedSearch) {
      filter.$or = [
        {
          name: {
            $regex: normalizedSearch,
            $options: "i",
          },
        },
        {
          sku: {
            $regex: normalizedSearch,
            $options: "i",
          },
        },
        {
          shortDescription: {
            $regex: normalizedSearch,
            $options: "i",
          },
        },
      ];
    }

    if (categoryId) {
      filter.categoryId = categoryId;
    }

    if (featured !== undefined) {
      filter.isFeatured =
        featured === "true";
    }

    const skip =
      (currentPage - 1) *
      currentLimit;

    const [
      products,
      total,
    ] = await Promise.all([
      Product.find(filter)
        .select(
          [
            "_id",
            "name",
            "slug",
            "shortDescription",
            "images",
            "price",
            "compareAtPrice",
            "stockQuantity",
            "trackInventory",
            "allowBackorder",
            "attributes",
            "variants",
            "isFeatured",
            "categoryId",
            "createdAt",
          ].join(" ")
        )
        .populate(
          "categoryId",
          "name slug"
        )
        .sort({
          isFeatured: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(currentLimit)
        .lean(),

      Product.countDocuments(filter),
    ]);

    const safeProducts =
      products.map(
        sanitizeProduct
      );

    return res.status(200).json({
      success: true,
      data: {
        products: safeProducts,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages: Math.ceil(
            total / currentLimit
          ),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * GET /api/v1/storefront/:tenantSlug/products/:productId
 *
 * Public product details.
 */
const getPublicProductById =
  async (
    req,
    res,
    next
  ) => {
    try {
      const tenant =
        await getTenant(
          req.params.tenantSlug
        );

      const product =
        await Product.findOne({
          _id: req.params.productId,
          tenantId: tenant._id,
          status: "ACTIVE",
        })
          .select(
            [
              "_id",
              "name",
              "slug",
              "description",
              "shortDescription",
              "images",
              "price",
              "compareAtPrice",
              "stockQuantity",
              "trackInventory",
              "allowBackorder",
              "attributes",
              "variants",
              "isFeatured",
              "categoryId",
              "seo",
              "createdAt",
            ].join(" ")
          )
          .populate(
            "categoryId",
            "name slug"
          )
          .lean();

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found",
        });
      }

      const safeProduct =
        sanitizeProduct(product);

      return res.status(200).json({
        success: true,
        data: {
          product: safeProduct,
        },
      });
    } catch (error) {
      next(error);
    }
  };

module.exports = {
  getStorefront,
  getPublicCategories,
  getPublicProducts,
  getPublicProductById,
};