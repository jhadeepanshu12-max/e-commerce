const Product = require("./product.model");
const InventoryTransaction = require("./inventory.model");

const createServiceError = (
  message,
  statusCode
) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getTargetStock = (
  product,
  variantId
) => {
  if (variantId) {
    const variant = product.variants.id(
      variantId
    );

    if (!variant) {
      throw createServiceError(
        "Product variant not found",
        404
      );
    }

    return {
      variant,
      quantity: variant.stockQuantity,
      reservedQuantity:
        variant.reservedQuantity || 0,
    };
  }

  return {
    variant: null,
    quantity: product.stockQuantity,
    reservedQuantity:
      product.reservedQuantity || 0,
  };
};

const createInventoryTransaction = async ({
  tenantId,
  productId,
  variantId,
  type,
  quantity,
  previousQuantity,
  newQuantity,
  reason,
  referenceType,
  referenceId,
  performedBy,
  session,
}) => {
  const transactionData = {
    tenantId,
    productId,
    variantId,
    type,
    quantity,
    previousQuantity,
    newQuantity,
    reason,
    referenceType,
    referenceId,
    performedBy,
  };

  if (session) {
    const transactions =
      await InventoryTransaction.create(
        [transactionData],
        { session }
      );

    return transactions[0];
  }

  return InventoryTransaction.create(
    transactionData
  );
};

const updateInventory = async ({
  tenantId,
  productId,
  variantId = null,
  type,
  quantity,
  reason = "",
  referenceType = "MANUAL",
  referenceId = null,
  performedBy,
  session = null,
}) => {
  if (
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    throw createServiceError(
      "Quantity must be a positive integer",
      400
    );
  }

  let productQuery = Product.findOne({
    _id: productId,
    tenantId,
  });

  if (session) {
    productQuery =
      productQuery.session(session);
  }

  const product =
    await productQuery;

  if (!product) {
    throw createServiceError(
      "Product not found",
      404
    );
  }

  const target =
    getTargetStock(
      product,
      variantId
    );

  let previousQuantity =
    target.quantity;

  let newQuantity =
    target.quantity;

  if (
    type === "STOCK_IN" ||
    type === "STOCK_OUT" ||
    type === "ADJUSTMENT"
  ) {
    switch (type) {
      case "STOCK_IN":
        newQuantity =
          previousQuantity +
          quantity;
        break;

      case "STOCK_OUT":
        newQuantity =
          previousQuantity -
          quantity;
        break;

      case "ADJUSTMENT":
        newQuantity = quantity;
        break;

      default:
        break;
    }

    if (newQuantity < 0) {
      throw createServiceError(
        "Insufficient stock",
        409
      );
    }

    if (target.variant) {
      target.variant.stockQuantity =
        newQuantity;
    } else {
      product.stockQuantity =
        newQuantity;
    }
  } else if (type === "RESERVE") {
    const availableQuantity =
      target.quantity -
      target.reservedQuantity;

    if (
      availableQuantity <
      quantity
    ) {
      throw createServiceError(
        "Insufficient available stock",
        409
      );
    }

    previousQuantity =
      availableQuantity;

    newQuantity =
      availableQuantity -
      quantity;

    if (target.variant) {
      target.variant.reservedQuantity =
        target.reservedQuantity +
        quantity;
    } else {
      product.reservedQuantity =
        target.reservedQuantity +
        quantity;
    }
  } else if (type === "RELEASE") {
    if (
      target.reservedQuantity <
      quantity
    ) {
      throw createServiceError(
        "Cannot release more inventory than currently reserved",
        409
      );
    }

    previousQuantity =
      target.quantity -
      target.reservedQuantity;

    newQuantity =
      previousQuantity +
      quantity;

    if (target.variant) {
      target.variant.reservedQuantity =
        target.reservedQuantity -
        quantity;
    } else {
      product.reservedQuantity =
        target.reservedQuantity -
        quantity;
    }
  } else if (
    type === "COMMIT_RESERVATION"
  ) {
    if (
      target.reservedQuantity <
      quantity
    ) {
      throw createServiceError(
        "Cannot commit more inventory than currently reserved",
        409
      );
    }

    if (
      target.quantity < quantity
    ) {
      throw createServiceError(
        "Insufficient stock to commit reservation",
        409
      );
    }

    previousQuantity =
      target.quantity;

    newQuantity =
      target.quantity -
      quantity;

    if (target.variant) {
      target.variant.stockQuantity =
        newQuantity;

      target.variant.reservedQuantity =
        target.reservedQuantity -
        quantity;
    } else {
      product.stockQuantity =
        newQuantity;

      product.reservedQuantity =
        target.reservedQuantity -
        quantity;
    }
  } else {
    throw createServiceError(
      `Inventory transaction type ${type} is not supported`,
      400
    );
  }

  if (session) {
    await product.save({
      session,
    });
  } else {
    await product.save();
  }

  const transaction =
    await createInventoryTransaction({
      tenantId,
      productId,
      variantId,
      type,
      quantity,
      previousQuantity,
      newQuantity,
      reason,
      referenceType,
      referenceId,
      performedBy,
      session,
    });

  return {
    product,
    transaction,
  };
};

module.exports = {
  updateInventory,
};