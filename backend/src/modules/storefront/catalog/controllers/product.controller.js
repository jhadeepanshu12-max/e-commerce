const Product = require("../product.model");
const Category = require("../category.model");

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const generateUniqueSlug = async (
  tenantId,
  name,
  excludeId = null
) => {
  const baseSlug = generateSlug(name) || "product";

  let slug = baseSlug;
  let counter = 1;

  const query = {
    tenantId,
    slug,
  };

  while (
    await Product.exists(
      excludeId
        ? {
            tenantId,
            slug,
            _id: { $ne: excludeId },
          }
        : query
    )
  ) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
};

const validateCategory = async (
  tenantId,
  categoryId
) => {
  return Category.exists({
    _id: categoryId,
    tenantId,
  });
};

const createProduct = async (req, res, next) => {
  try {
    const tenantId = req.auth.tenantId;

    const {
      name,
      categoryId,
      description = "",
      shortDescription = "",
      sku,
      images = [],
      price,
      compareAtPrice = null,
      costPrice = null,
      stockQuantity = 0,
      trackInventory = true,
      allowBackorder = false,
      attributes = {},
      variants = [],
      status = "DRAFT",
      isFeatured = false,
      seo = {},
    } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Product name must contain at least 2 characters",
      });
    }

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    if (!sku) {
      return res.status(400).json({
        success: false,
        message: "Product SKU is required",
      });
    }

    if (
      price === undefined ||
      price === null ||
      Number(price) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid product price is required",
      });
    }

    const categoryExists = await validateCategory(
      tenantId,
      categoryId
    );

    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: "Category does not belong to this tenant",
      });
    }

    const existingSku = await Product.exists({
      tenantId,
      sku: sku.trim().toUpperCase(),
    });

    if (existingSku) {
      return res.status(409).json({
        success: false,
        message: "Product SKU already exists",
      });
    }

    const slug = await generateUniqueSlug(
      tenantId,
      name
    );

    const product = await Product.create({
      tenantId,
      categoryId,
      name: name.trim(),
      slug,
      description,
      shortDescription,
      sku: sku.trim().toUpperCase(),
      images,
      price,
      compareAtPrice,
      costPrice,
      stockQuantity,
      trackInventory,
      allowBackorder,
      attributes,
      variants,
      status,
      isFeatured,
      seo,
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: {
        product,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getProducts = async (req, res, next) => {
  try {
    const tenantId = req.auth.tenantId;

    const {
      page = 1,
      limit = 20,
      search = "",
      categoryId,
      status,
      featured,
    } = req.query;

    const currentPage = Math.max(
      Number(page) || 1,
      1
    );

    const currentLimit = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    const filter = {
      tenantId,
    };

    if (search.trim()) {
      filter.$or = [
        {
          name: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          sku: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }

    if (categoryId) {
      filter.categoryId = categoryId;
    }

    if (status) {
      filter.status = status;
    }

    if (featured !== undefined) {
      filter.isFeatured = featured === "true";
    }

    const skip =
      (currentPage - 1) * currentLimit;

    const [products, total] =
      await Promise.all([
        Product.find(filter)
          .populate(
            "categoryId",
            "name slug"
          )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(currentLimit),

        Product.countDocuments(filter),
      ]);

    return res.status(200).json({
      success: true,
      data: {
        products,
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

const getProductById = async (
  req,
  res,
  next
) => {
  try {
    const tenantId = req.auth.tenantId;

    const product = await Product.findOne({
      _id: req.params.id,
      tenantId,
    }).populate(
      "categoryId",
      "name slug"
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        product,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (
  req,
  res,
  next
) => {
  try {
    const tenantId = req.auth.tenantId;

    const allowedFields = [
      "name",
      "categoryId",
      "description",
      "shortDescription",
      "sku",
      "images",
      "price",
      "compareAtPrice",
      "costPrice",
      "stockQuantity",
      "trackInventory",
      "allowBackorder",
      "attributes",
      "variants",
      "status",
      "isFeatured",
      "seo",
    ];

    const updateData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (updateData.categoryId) {
      const categoryExists =
        await validateCategory(
          tenantId,
          updateData.categoryId
        );

      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message:
            "Category does not belong to this tenant",
        });
      }
    }

    if (updateData.sku) {
      updateData.sku =
        updateData.sku
          .trim()
          .toUpperCase();

      const existingSku =
        await Product.exists({
          tenantId,
          sku: updateData.sku,
          _id: {
            $ne: req.params.id,
          },
        });

      if (existingSku) {
        return res.status(409).json({
          success: false,
          message:
            "Product SKU already exists",
        });
      }
    }

    if (updateData.name) {
      updateData.name =
        updateData.name.trim();

      updateData.slug =
        await generateUniqueSlug(
          tenantId,
          updateData.name,
          req.params.id
        );
    }

    const product =
      await Product.findOneAndUpdate(
        {
          _id: req.params.id,
          tenantId,
        },
        updateData,
        {
          new: true,
          runValidators: true,
        }
      ).populate(
        "categoryId",
        "name slug"
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Product updated successfully",
      data: {
        product,
      },
    });
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (
  req,
  res,
  next
) => {
  try {
    const tenantId = req.auth.tenantId;

    const product =
      await Product.findOneAndDelete({
        _id: req.params.id,
        tenantId,
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Product deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};