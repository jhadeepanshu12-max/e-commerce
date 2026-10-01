const Product = require("../product.model");
const InventoryTransaction = require("../inventory.model");
const {
  updateInventory,
} = require("../inventory.service");

const adjustInventory = async (
  req,
  res,
  next
) => {
  try {
    const tenantId =
      req.auth.tenantId;

    const {
      productId,
      variantId = null,
      type,
      quantity,
      reason = "",
    } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message:
          "Product ID is required",
      });
    }

    if (
      ![
        "STOCK_IN",
        "STOCK_OUT",
        "ADJUSTMENT",
      ].includes(type)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid inventory transaction type",
      });
    }

    const result =
      await updateInventory({
        tenantId,
        productId,
        variantId,
        type,
        quantity: Number(quantity),
        reason,
        referenceType: "MANUAL",
        performedBy:
          req.auth.userId,
      });

    return res.status(200).json({
      success: true,
      message:
        "Inventory updated successfully",
      data: {
        product: result.product,
        transaction:
          result.transaction,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getInventoryHistory = async (
  req,
  res,
  next
) => {
  try {
    const tenantId =
      req.auth.tenantId;

    const {
      productId,
      variantId,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {
      tenantId,
    };

    if (productId) {
      filter.productId = productId;
    }

    if (variantId) {
      filter.variantId = variantId;
    }

    const currentPage = Math.max(
      Number(page) || 1,
      1
    );

    const currentLimit = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    const skip =
      (currentPage - 1) *
      currentLimit;

    const [
      transactions,
      total,
    ] = await Promise.all([
      InventoryTransaction.find(filter)
        .populate(
          "productId",
          "name sku"
        )
        .populate(
          "performedBy",
          "name email"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(currentLimit),

      InventoryTransaction.countDocuments(
        filter
      ),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        transactions,
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

const getProductInventory =
  async (req, res, next) => {
    try {
      const tenantId =
        req.auth.tenantId;

      const product =
        await Product.findOne({
          _id: req.params.productId,
          tenantId,
        }).select(
          "name sku stockQuantity reservedQuantity variants trackInventory allowBackorder"
        );

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          inventory: product,
        },
      });
    } catch (error) {
      next(error);
    }
  };

module.exports = {
  adjustInventory,
  getInventoryHistory,
  getProductInventory,
};