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

const generateUniqueSlug = async (tenantId, name) => {
  const baseSlug = generateSlug(name) || "category";

  let slug = baseSlug;
  let counter = 1;

  while (
    await Category.exists({
      tenantId,
      slug,
    })
  ) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
};

const createCategory = async (req, res, next) => {
  try {
    const {
      name,
      description = "",
      imageUrl = "",
      parentId = null,
      isActive = true,
      sortOrder = 0,
    } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Category name must contain at least 2 characters",
      });
    }

    const tenantId = req.auth.tenantId;

    if (parentId) {
      const parentCategory = await Category.findOne({
        _id: parentId,
        tenantId,
      });

      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: "Parent category does not belong to this tenant",
        });
      }
    }

    const slug = await generateUniqueSlug(
      tenantId,
      name
    );

    const category = await Category.create({
      tenantId,
      name: name.trim(),
      slug,
      description,
      imageUrl,
      parentId,
      isActive,
      sortOrder,
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: {
        category,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const tenantId = req.auth.tenantId;

    const categories = await Category.find({
      tenantId,
    }).sort({
      sortOrder: 1,
      name: 1,
    });

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

const getCategoryById = async (req, res, next) => {
  try {
    const tenantId = req.auth.tenantId;

    const category = await Category.findOne({
      _id: req.params.id,
      tenantId,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        category,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const tenantId = req.auth.tenantId;

    const allowedFields = [
      "name",
      "description",
      "imageUrl",
      "parentId",
      "isActive",
      "sortOrder",
    ];

    const updateData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (updateData.name) {
      updateData.name = updateData.name.trim();

      updateData.slug = await generateUniqueSlug(
        tenantId,
        updateData.name
      );
    }

    if (updateData.parentId) {
      const parentCategory = await Category.findOne({
        _id: updateData.parentId,
        tenantId,
      });

      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: "Parent category does not belong to this tenant",
        });
      }

      if (
        parentCategory._id.toString() ===
        req.params.id
      ) {
        return res.status(400).json({
          success: false,
          message: "Category cannot be its own parent",
        });
      }
    }

    const category = await Category.findOneAndUpdate(
      {
        _id: req.params.id,
        tenantId,
      },
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: {
        category,
      },
    });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const tenantId = req.auth.tenantId;

    const childCategory = await Category.findOne({
      tenantId,
      parentId: req.params.id,
    });

    if (childCategory) {
      return res.status(409).json({
        success: false,
        message:
          "Cannot delete a category that has child categories",
      });
    }

    const productExists = await require("../product.model").exists({
      tenantId,
      categoryId: req.params.id,
    });

    if (productExists) {
      return res.status(409).json({
        success: false,
        message:
          "Cannot delete a category that contains products",
      });
    }

    const category = await Category.findOneAndDelete({
      _id: req.params.id,
      tenantId,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};