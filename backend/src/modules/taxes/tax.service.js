const mongoose = require("mongoose");

const TaxRule = require("./tax-rule.model");
const Product = require("../catalog/product.model");

const createTaxError = (
  message,
  statusCode = 400
) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) =>
      String(item).trim().toUpperCase()
    )
    .filter(Boolean);
};

const normalizePostalCodes = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item).trim())
    .filter(Boolean);
};

const roundMoney = (value) =>
  Number(Number(value).toFixed(2));

const validateObjectId = (
  value,
  fieldName
) => {
  if (!mongoose.isValidObjectId(value)) {
    throw createTaxError(
      `Invalid ${fieldName}`,
      400
    );
  }
};

const validateRate = (
  taxType,
  rate
) => {
  const numericRate = Number(rate);

  if (
    Number.isNaN(numericRate) ||
    numericRate < 0
  ) {
    throw createTaxError(
      "Tax rate must be a valid non-negative number",
      400
    );
  }

  if (
    taxType === "PERCENTAGE" &&
    numericRate > 100
  ) {
    throw createTaxError(
      "Percentage tax rate cannot exceed 100",
      400
    );
  }

  return numericRate;
};

const validateEffectiveDates = (
  effectiveFrom,
  effectiveUntil
) => {
  if (
    effectiveFrom &&
    effectiveUntil &&
    new Date(effectiveFrom) >
      new Date(effectiveUntil)
  ) {
    throw createTaxError(
      "Effective start date cannot be after effective end date",
      400
    );
  }
};

const validateOrderLimits = (
  minimumOrderValue,
  maximumOrderValue
) => {
  const minimum =
    minimumOrderValue !== undefined &&
    minimumOrderValue !== null
      ? Number(minimumOrderValue)
      : 0;

  const maximum =
    maximumOrderValue !== undefined &&
    maximumOrderValue !== null
      ? Number(maximumOrderValue)
      : null;

  if (
    Number.isNaN(minimum) ||
    minimum < 0
  ) {
    throw createTaxError(
      "Minimum order value must be a valid non-negative number",
      400
    );
  }

  if (
    maximum !== null &&
    (Number.isNaN(maximum) ||
      maximum < 0)
  ) {
    throw createTaxError(
      "Maximum order value must be a valid non-negative number",
      400
    );
  }

  if (
    maximum !== null &&
    minimum > maximum
  ) {
    throw createTaxError(
      "Minimum order value cannot exceed maximum order value",
      400
    );
  }

  return {
    minimum,
    maximum,
  };
};

const createTaxRule = async ({
  tenantId,
  name,
  code,
  taxType = "PERCENTAGE",
  rate,
  currency = "INR",
  countries,
  states,
  cities,
  postalCodes,
  productIds = [],
  categoryIds = [],
  appliesToAllProducts = true,
  priceIncludesTax = false,
  minimumOrderValue = 0,
  maximumOrderValue = null,
  priority = 0,
  effectiveFrom = null,
  effectiveUntil = null,
  isActive = true,
}) => {
  if (!name || !String(name).trim()) {
    throw createTaxError(
      "Tax rule name is required",
      400
    );
  }

  if (!code || !String(code).trim()) {
    throw createTaxError(
      "Tax code is required",
      400
    );
  }

  const normalizedTaxType =
    String(taxType).toUpperCase();

  if (
    ![
      "PERCENTAGE",
      "FIXED",
    ].includes(normalizedTaxType)
  ) {
    throw createTaxError(
      "Invalid tax type",
      400
    );
  }

  const numericRate = validateRate(
    normalizedTaxType,
    rate
  );

  const normalizedLimits =
    validateOrderLimits(
      minimumOrderValue,
      maximumOrderValue
    );

  validateEffectiveDates(
    effectiveFrom,
    effectiveUntil
  );

  const normalizedProductIds =
    productIds.map((id) => {
      validateObjectId(
        id,
        "productId"
      );

      return id;
    });

  const normalizedCategoryIds =
    categoryIds.map((id) => {
      validateObjectId(
        id,
        "categoryId"
      );

      return id;
    });

  const normalizedCode =
    String(code)
      .trim()
      .toUpperCase();

  const existingRule =
    await TaxRule.findOne({
      tenantId,
      code: normalizedCode,
    });

  if (existingRule) {
    throw createTaxError(
      "Tax rule with this code already exists",
      409
    );
  }

  return TaxRule.create({
    tenantId,
    name: String(name).trim(),
    code: normalizedCode,
    taxType: normalizedTaxType,
    rate: numericRate,
    currency: String(currency)
      .trim()
      .toUpperCase(),
    countries:
      countries !== undefined
        ? normalizeArray(countries)
        : ["IN"],
    states: normalizeArray(states),
    cities: normalizeArray(cities),
    postalCodes:
      normalizePostalCodes(postalCodes),
    productIds: normalizedProductIds,
    categoryIds: normalizedCategoryIds,
    appliesToAllProducts:
      Boolean(appliesToAllProducts),
    priceIncludesTax:
      Boolean(priceIncludesTax),
    minimumOrderValue:
      normalizedLimits.minimum,
    maximumOrderValue:
      normalizedLimits.maximum,
    priority: Number(priority) || 0,
    effectiveFrom:
      effectiveFrom
        ? new Date(effectiveFrom)
        : null,
    effectiveUntil:
      effectiveUntil
        ? new Date(effectiveUntil)
        : null,
    isActive: Boolean(isActive),
  });
};

const getTaxRules = async ({
  tenantId,
  includeInactive = false,
}) => {
  const filter = {
    tenantId,
  };

  if (!includeInactive) {
    filter.isActive = true;
  }

  return TaxRule.find(filter)
    .sort({
      priority: -1,
      createdAt: -1,
    })
    .lean();
};

const getTaxRuleById = async ({
  tenantId,
  taxRuleId,
}) => {
  validateObjectId(
    taxRuleId,
    "taxRuleId"
  );

  const rule =
    await TaxRule.findOne({
      _id: taxRuleId,
      tenantId,
    }).lean();

  if (!rule) {
    throw createTaxError(
      "Tax rule not found",
      404
    );
  }

  return rule;
};

const updateTaxRule = async ({
  tenantId,
  taxRuleId,
  name,
  code,
  taxType,
  rate,
  currency,
  countries,
  states,
  cities,
  postalCodes,
  productIds,
  categoryIds,
  appliesToAllProducts,
  priceIncludesTax,
  minimumOrderValue,
  maximumOrderValue,
  priority,
  effectiveFrom,
  effectiveUntil,
  isActive,
}) => {
  validateObjectId(
    taxRuleId,
    "taxRuleId"
  );

  const rule =
    await TaxRule.findOne({
      _id: taxRuleId,
      tenantId,
    });

  if (!rule) {
    throw createTaxError(
      "Tax rule not found",
      404
    );
  }

  if (name !== undefined) {
    if (!String(name).trim()) {
      throw createTaxError(
        "Tax rule name is required",
        400
      );
    }

    rule.name = String(name).trim();
  }

  if (code !== undefined) {
    const normalizedCode =
      String(code)
        .trim()
        .toUpperCase();

    const duplicate =
      await TaxRule.findOne({
        tenantId,
        code: normalizedCode,
        _id: {
          $ne: taxRuleId,
        },
      });

    if (duplicate) {
      throw createTaxError(
        "Tax rule with this code already exists",
        409
      );
    }

    rule.code = normalizedCode;
  }

  if (taxType !== undefined) {
    const normalizedTaxType =
      String(taxType).toUpperCase();

    if (
      ![
        "PERCENTAGE",
        "FIXED",
      ].includes(normalizedTaxType)
    ) {
      throw createTaxError(
        "Invalid tax type",
        400
      );
    }

    rule.taxType = normalizedTaxType;
  }

  if (rate !== undefined) {
    rule.rate = validateRate(
      rule.taxType,
      rate
    );
  }

  if (currency !== undefined) {
    rule.currency = String(currency)
      .trim()
      .toUpperCase();
  }

  if (countries !== undefined) {
    rule.countries =
      normalizeArray(countries);
  }

  if (states !== undefined) {
    rule.states =
      normalizeArray(states);
  }

  if (cities !== undefined) {
    rule.cities =
      normalizeArray(cities);
  }

  if (postalCodes !== undefined) {
    rule.postalCodes =
      normalizePostalCodes(
        postalCodes
      );
  }

  if (productIds !== undefined) {
    rule.productIds =
      productIds.map((id) => {
        validateObjectId(
          id,
          "productId"
        );

        return id;
      });
  }

  if (categoryIds !== undefined) {
    rule.categoryIds =
      categoryIds.map((id) => {
        validateObjectId(
          id,
          "categoryId"
        );

        return id;
      });
  }

  if (
    appliesToAllProducts !==
    undefined
  ) {
    rule.appliesToAllProducts =
      Boolean(
        appliesToAllProducts
      );
  }

  if (
    priceIncludesTax !==
    undefined
  ) {
    rule.priceIncludesTax =
      Boolean(
        priceIncludesTax
      );
  }

  if (
    minimumOrderValue !==
      undefined ||
    maximumOrderValue !==
      undefined
  ) {
    const limits =
      validateOrderLimits(
        minimumOrderValue !==
          undefined
          ? minimumOrderValue
          : rule.minimumOrderValue,
        maximumOrderValue !==
          undefined
          ? maximumOrderValue
          : rule.maximumOrderValue
      );

    rule.minimumOrderValue =
      limits.minimum;

    rule.maximumOrderValue =
      limits.maximum;
  }

  if (priority !== undefined) {
    const numericPriority =
      Number(priority);

    if (
      Number.isNaN(
        numericPriority
      ) ||
      numericPriority < 0
    ) {
      throw createTaxError(
        "Priority must be a valid non-negative number",
        400
      );
    }

    rule.priority =
      numericPriority;
  }

  if (
    effectiveFrom !==
    undefined
  ) {
    rule.effectiveFrom =
      effectiveFrom
        ? new Date(effectiveFrom)
        : null;
  }

  if (
    effectiveUntil !==
    undefined
  ) {
    rule.effectiveUntil =
      effectiveUntil
        ? new Date(effectiveUntil)
        : null;
  }

  validateEffectiveDates(
    rule.effectiveFrom,
    rule.effectiveUntil
  );

  if (isActive !== undefined) {
    rule.isActive =
      Boolean(isActive);
  }

  await rule.save();

  return rule;
};

const deleteTaxRule = async ({
  tenantId,
  taxRuleId,
}) => {
  validateObjectId(
    taxRuleId,
    "taxRuleId"
  );

  const rule =
    await TaxRule.findOne({
      _id: taxRuleId,
      tenantId,
    });

  if (!rule) {
    throw createTaxError(
      "Tax rule not found",
      404
    );
  }

  await rule.deleteOne();
};

const matchesTaxRule = ({
  rule,
  productId,
  categoryId,
  country,
  state,
  city,
  postalCode,
  orderValue,
  now = new Date(),
}) => {
  const normalizedCountry =
    String(country || "IN")
      .trim()
      .toUpperCase();

  const normalizedState =
    String(state || "")
      .trim()
      .toUpperCase();

  const normalizedCity =
    String(city || "")
      .trim()
      .toUpperCase();

  const normalizedPostalCode =
    String(postalCode || "")
      .trim();

  if (
    rule.effectiveFrom &&
    now < new Date(rule.effectiveFrom)
  ) {
    return false;
  }

  if (
    rule.effectiveUntil &&
    now > new Date(rule.effectiveUntil)
  ) {
    return false;
  }

  if (
    rule.countries.length > 0 &&
    !rule.countries.includes(
      normalizedCountry
    )
  ) {
    return false;
  }

  if (
    rule.states.length > 0 &&
    !rule.states.includes(
      normalizedState
    )
  ) {
    return false;
  }

  if (
    rule.cities.length > 0 &&
    !rule.cities.includes(
      normalizedCity
    )
  ) {
    return false;
  }

  if (
    rule.postalCodes.length > 0 &&
    !rule.postalCodes.includes(
      normalizedPostalCode
    )
  ) {
    return false;
  }

  const hasProductRestriction =
    rule.productIds.length > 0;

  const hasCategoryRestriction =
    rule.categoryIds.length > 0;

  if (
    hasProductRestriction ||
    hasCategoryRestriction
  ) {
    const productMatches =
      hasProductRestriction &&
      rule.productIds.some(
        (id) =>
          String(id) ===
          String(productId)
      );

    const categoryMatches =
      hasCategoryRestriction &&
      rule.categoryIds.some(
        (id) =>
          String(id) ===
          String(categoryId)
      );

    if (
      !productMatches &&
      !categoryMatches
    ) {
      return false;
    }
  } else if (
    !rule.appliesToAllProducts
  ) {
    return false;
  }

  const numericOrderValue =
    Number(orderValue || 0);

  if (
    numericOrderValue <
    Number(
      rule.minimumOrderValue || 0
    )
  ) {
    return false;
  }

  if (
    rule.maximumOrderValue !==
      null &&
    rule.maximumOrderValue !==
      undefined &&
    numericOrderValue >
      Number(
        rule.maximumOrderValue
      )
  ) {
    return false;
  }

  return true;
};

const calculateTaxAmount = ({
  taxType,
  rate,
  amount,
  quantity,
  priceIncludesTax,
}) => {
  const numericRate =
    Number(rate);

  const numericAmount =
    Number(amount);

  const numericQuantity =
    Number(quantity);

  if (
    taxType === "FIXED"
  ) {
    return roundMoney(
      numericRate *
        numericQuantity
    );
  }

  if (!priceIncludesTax) {
    return roundMoney(
      numericAmount *
        (numericRate / 100)
    );
  }

  const taxPerUnit =
    numericAmount -
    numericAmount /
      (1 + numericRate / 100);

  return roundMoney(
    taxPerUnit *
      numericQuantity
  );
};

const calculateTax = async ({
  tenantId,
  items,
  country = "IN",
  state = "",
  city = "",
  postalCode = "",
}) => {
  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    throw createTaxError(
      "At least one item is required",
      400
    );
  }

  const normalizedItems = [];

  for (const item of items) {
    if (!item.productId) {
      throw createTaxError(
        "productId is required for every tax item",
        400
      );
    }

    validateObjectId(
      item.productId,
      "productId"
    );

    const quantity =
      Number(item.quantity);

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      throw createTaxError(
        "Quantity must be a positive integer",
        400
      );
    }

    let product =
      await Product.findOne({
        _id: item.productId,
        tenantId,
      }).lean();

    if (!product) {
      throw createTaxError(
        "Product not found",
        404
      );
    }

    if (
      product.status !== "ACTIVE"
    ) {
      throw createTaxError(
        `Product "${product.name}" is not currently available`,
        400
      );
    }

    let unitPrice =
      Number(product.price);

    let variantId =
      item.variantId || null;

    let variant = null;

    if (variantId) {
      if (
        !mongoose.isValidObjectId(
          variantId
        )
      ) {
        throw createTaxError(
          "Invalid variantId",
          400
        );
      }

      variant =
        product.variants.find(
          (entry) =>
            String(entry._id) ===
            String(variantId)
        );

      if (!variant) {
        throw createTaxError(
          "Variant not found",
          404
        );
      }

      if (!variant.isActive) {
        throw createTaxError(
          "Selected variant is not active",
          400
        );
      }

      unitPrice =
        Number(variant.price);
    }

    const lineAmount =
      roundMoney(
        unitPrice * quantity
      );

    normalizedItems.push({
      productId:
        product._id,
      variantId,
      categoryId:
        product.categoryId,
      productName:
        product.name,
      quantity,
      unitPrice,
      lineAmount,
    });
  }

  const orderValue =
    roundMoney(
      normalizedItems.reduce(
        (sum, item) =>
          sum + item.lineAmount,
        0
      )
    );

  const rules =
    await TaxRule.find({
      tenantId,
      isActive: true,
    })
      .sort({
        priority: -1,
        createdAt: -1,
      })
      .lean();

  const results =
    normalizedItems.map(
      (item) => {
        const matchingRules =
          rules.filter((rule) =>
            matchesTaxRule({
              rule,
              productId:
                item.productId,
              categoryId:
                item.categoryId,
              country,
              state,
              city,
              postalCode,
              orderValue,
            })
          );

        const appliedRules =
          matchingRules.map(
            (rule) => {
              const amount =
                calculateTaxAmount({
                  taxType:
                    rule.taxType,
                  rate: rule.rate,
                  amount:
                    item.unitPrice,
                  quantity:
                    item.quantity,
                  priceIncludesTax:
                    rule.priceIncludesTax,
                });

              return {
                taxRuleId:
                  rule._id,
                name:
                  rule.name,
                code:
                  rule.code,
                taxType:
                  rule.taxType,
                rate:
                  rule.rate,
                priceIncludesTax:
                  rule.priceIncludesTax,
                amount,
              };
            }
          );

        const taxAmount =
          roundMoney(
            appliedRules.reduce(
              (sum, rule) =>
                sum + rule.amount,
              0
            )
          );

        return {
          productId:
            item.productId,
          variantId:
            item.variantId,
          productName:
            item.productName,
          quantity:
            item.quantity,
          unitPrice:
            item.unitPrice,
          lineAmount:
            item.lineAmount,
          taxAmount,
          rules:
            appliedRules,
        };
      }
    );

  const totalTax =
    roundMoney(
      results.reduce(
        (sum, item) =>
          sum + item.taxAmount,
        0
      )
    );

  return {
    subtotal: orderValue,
    totalTax,
    currency: "INR",
    items: results,
  };
};

module.exports = {
  createTaxRule,
  getTaxRules,
  getTaxRuleById,
  updateTaxRule,
  deleteTaxRule,
  matchesTaxRule,
  calculateTaxAmount,
  calculateTax,
};