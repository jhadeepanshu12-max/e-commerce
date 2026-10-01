const mongoose = require("mongoose");

const ShippingZone = require("./shipping-zone.model");
const ShippingRate = require("./shipping-rate.model");

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item).trim().toUpperCase())
    .filter(Boolean);
};

const normalizePostalCode = (value) => {
  return String(value || "").trim();
};

const validateObjectId = (value, fieldName) => {
  if (!mongoose.isValidObjectId(value)) {
    throw createHttpError(
      400,
      `Invalid ${fieldName}`
    );
  }
};

const createShippingZone = async ({
  tenantId,
  name,
  description,
  countries,
  states,
  cities,
  postalCodes,
  priority,
}) => {
  if (!name || !String(name).trim()) {
    throw createHttpError(
      400,
      "Shipping zone name is required"
    );
  }

  const existingZone =
    await ShippingZone.findOne({
      tenantId,
      name: String(name).trim(),
    });

  if (existingZone) {
    throw createHttpError(
      409,
      "Shipping zone with this name already exists"
    );
  }

  return ShippingZone.create({
    tenantId,
    name: String(name).trim(),
    description: description || "",
    countries:
      countries !== undefined
        ? normalizeArray(countries)
        : ["IN"],
    states: normalizeArray(states),
    cities: normalizeArray(cities),
    postalCodes: Array.isArray(postalCodes)
      ? postalCodes
          .map(normalizePostalCode)
          .filter(Boolean)
      : [],
    priority:
      priority !== undefined
        ? Number(priority)
        : 0,
  });
};

const getShippingZones = async ({
  tenantId,
  includeInactive = false,
}) => {
  const filter = {
    tenantId,
  };

  if (!includeInactive) {
    filter.isActive = true;
  }

  return ShippingZone.find(filter)
    .sort({
      priority: -1,
      createdAt: -1,
    })
    .lean();
};

const getShippingZoneById = async ({
  tenantId,
  zoneId,
}) => {
  validateObjectId(zoneId, "zoneId");

  const zone =
    await ShippingZone.findOne({
      _id: zoneId,
      tenantId,
    }).lean();

  if (!zone) {
    throw createHttpError(
      404,
      "Shipping zone not found"
    );
  }

  return zone;
};

const updateShippingZone = async ({
  tenantId,
  zoneId,
  name,
  description,
  countries,
  states,
  cities,
  postalCodes,
  priority,
  isActive,
}) => {
  validateObjectId(zoneId, "zoneId");

  const zone =
    await ShippingZone.findOne({
      _id: zoneId,
      tenantId,
    });

  if (!zone) {
    throw createHttpError(
      404,
      "Shipping zone not found"
    );
  }

  if (
    name !== undefined &&
    String(name).trim() !== zone.name
  ) {
    const duplicate =
      await ShippingZone.findOne({
        tenantId,
        name: String(name).trim(),
        _id: {
          $ne: zoneId,
        },
      });

    if (duplicate) {
      throw createHttpError(
        409,
        "Shipping zone with this name already exists"
      );
    }

    zone.name = String(name).trim();
  }

  if (description !== undefined) {
    zone.description = String(description);
  }

  if (countries !== undefined) {
    zone.countries =
      normalizeArray(countries);
  }

  if (states !== undefined) {
    zone.states =
      normalizeArray(states);
  }

  if (cities !== undefined) {
    zone.cities =
      normalizeArray(cities);
  }

  if (postalCodes !== undefined) {
    zone.postalCodes = Array.isArray(
      postalCodes
    )
      ? postalCodes
          .map(normalizePostalCode)
          .filter(Boolean)
      : [];
  }

  if (priority !== undefined) {
    zone.priority = Number(priority);
  }

  if (isActive !== undefined) {
    zone.isActive = Boolean(isActive);
  }

  await zone.save();

  return zone;
};

const deleteShippingZone = async ({
  tenantId,
  zoneId,
}) => {
  validateObjectId(zoneId, "zoneId");

  const zone =
    await ShippingZone.findOne({
      _id: zoneId,
      tenantId,
    });

  if (!zone) {
    throw createHttpError(
      404,
      "Shipping zone not found"
    );
  }

  await ShippingRate.deleteMany({
    tenantId,
    zoneId,
  });

  await zone.deleteOne();
};

const createShippingRate = async ({
  tenantId,
  zoneId,
  name,
  description,
  method,
  amount,
  freeShippingThreshold,
  minimumOrderValue,
  maximumOrderValue,
  minimumWeight,
  maximumWeight,
  estimatedDeliveryMinDays,
  estimatedDeliveryMaxDays,
  sortOrder,
}) => {
  validateObjectId(zoneId, "zoneId");

  const zone =
    await ShippingZone.findOne({
      _id: zoneId,
      tenantId,
    });

  if (!zone) {
    throw createHttpError(
      404,
      "Shipping zone not found"
    );
  }

  if (!name || !String(name).trim()) {
    throw createHttpError(
      400,
      "Shipping rate name is required"
    );
  }

  const allowedMethods = [
    "FLAT",
    "FREE",
    "ORDER_VALUE",
    "WEIGHT",
  ];

  const normalizedMethod =
    String(method || "FLAT").toUpperCase();

  if (
    !allowedMethods.includes(
      normalizedMethod
    )
  ) {
    throw createHttpError(
      400,
      "Invalid shipping rate method"
    );
  }

  const numericAmount =
    amount !== undefined
      ? Number(amount)
      : 0;

  if (
    Number.isNaN(numericAmount) ||
    numericAmount < 0
  ) {
    throw createHttpError(
      400,
      "Shipping amount must be a valid non-negative number"
    );
  }

  if (
    estimatedDeliveryMinDays !==
      undefined &&
    estimatedDeliveryMaxDays !==
      undefined &&
    Number(estimatedDeliveryMinDays) >
      Number(estimatedDeliveryMaxDays)
  ) {
    throw createHttpError(
      400,
      "Minimum delivery days cannot exceed maximum delivery days"
    );
  }

  return ShippingRate.create({
    tenantId,
    zoneId,
    name: String(name).trim(),
    description: description || "",
    method: normalizedMethod,
    amount: numericAmount,
    freeShippingThreshold:
      freeShippingThreshold !== undefined
        ? Number(freeShippingThreshold)
        : null,
    minimumOrderValue:
      minimumOrderValue !== undefined
        ? Number(minimumOrderValue)
        : 0,
    maximumOrderValue:
      maximumOrderValue !== undefined
        ? Number(maximumOrderValue)
        : null,
    minimumWeight:
      minimumWeight !== undefined
        ? Number(minimumWeight)
        : null,
    maximumWeight:
      maximumWeight !== undefined
        ? Number(maximumWeight)
        : null,
    estimatedDeliveryMinDays:
      estimatedDeliveryMinDays !== undefined
        ? Number(estimatedDeliveryMinDays)
        : 2,
    estimatedDeliveryMaxDays:
      estimatedDeliveryMaxDays !== undefined
        ? Number(estimatedDeliveryMaxDays)
        : 5,
    sortOrder:
      sortOrder !== undefined
        ? Number(sortOrder)
        : 0,
  });
};

const getShippingRates = async ({
  tenantId,
  zoneId,
  includeInactive = false,
}) => {
  validateObjectId(zoneId, "zoneId");

  const zone =
    await ShippingZone.findOne({
      _id: zoneId,
      tenantId,
    });

  if (!zone) {
    throw createHttpError(
      404,
      "Shipping zone not found"
    );
  }

  const filter = {
    tenantId,
    zoneId,
  };

  if (!includeInactive) {
    filter.isActive = true;
  }

  return ShippingRate.find(filter)
    .sort({
      sortOrder: 1,
      createdAt: 1,
    })
    .lean();
};

const updateShippingRate = async ({
  tenantId,
  rateId,
  name,
  description,
  method,
  amount,
  freeShippingThreshold,
  minimumOrderValue,
  maximumOrderValue,
  minimumWeight,
  maximumWeight,
  estimatedDeliveryMinDays,
  estimatedDeliveryMaxDays,
  sortOrder,
  isActive,
}) => {
  validateObjectId(rateId, "rateId");

  const rate =
    await ShippingRate.findOne({
      _id: rateId,
      tenantId,
    });

  if (!rate) {
    throw createHttpError(
      404,
      "Shipping rate not found"
    );
  }

  if (name !== undefined) {
    rate.name = String(name).trim();
  }

  if (description !== undefined) {
    rate.description =
      String(description);
  }

  if (method !== undefined) {
    const normalizedMethod =
      String(method).toUpperCase();

    if (
      ![
        "FLAT",
        "FREE",
        "ORDER_VALUE",
        "WEIGHT",
      ].includes(normalizedMethod)
    ) {
      throw createHttpError(
        400,
        "Invalid shipping rate method"
      );
    }

    rate.method = normalizedMethod;
  }

  if (amount !== undefined) {
    const numericAmount = Number(amount);

    if (
      Number.isNaN(numericAmount) ||
      numericAmount < 0
    ) {
      throw createHttpError(
        400,
        "Shipping amount must be a valid non-negative number"
      );
    }

    rate.amount = numericAmount;
  }

  const numericFields = [
    [
      "freeShippingThreshold",
      freeShippingThreshold,
    ],
    [
      "minimumOrderValue",
      minimumOrderValue,
    ],
    [
      "maximumOrderValue",
      maximumOrderValue,
    ],
    ["minimumWeight", minimumWeight],
    ["maximumWeight", maximumWeight],
    [
      "estimatedDeliveryMinDays",
      estimatedDeliveryMinDays,
    ],
    [
      "estimatedDeliveryMaxDays",
      estimatedDeliveryMaxDays,
    ],
    ["sortOrder", sortOrder],
  ];

  for (const [field, value] of numericFields) {
    if (value !== undefined) {
      const numericValue = Number(value);

      if (
        Number.isNaN(numericValue) ||
        numericValue < 0
      ) {
        throw createHttpError(
          400,
          `${field} must be a valid non-negative number`
        );
      }

      rate[field] = numericValue;
    }
  }

  if (
    rate.estimatedDeliveryMinDays >
    rate.estimatedDeliveryMaxDays
  ) {
    throw createHttpError(
      400,
      "Minimum delivery days cannot exceed maximum delivery days"
    );
  }

  if (isActive !== undefined) {
    rate.isActive = Boolean(isActive);
  }

  await rate.save();

  return rate;
};

const deleteShippingRate = async ({
  tenantId,
  rateId,
}) => {
  validateObjectId(rateId, "rateId");

  const rate =
    await ShippingRate.findOne({
      _id: rateId,
      tenantId,
    });

  if (!rate) {
    throw createHttpError(
      404,
      "Shipping rate not found"
    );
  }

  await rate.deleteOne();
};

const matchesZone = ({
  zone,
  country,
  state,
  city,
  postalCode,
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
    normalizePostalCode(postalCode);

  if (
    zone.countries.length > 0 &&
    !zone.countries.includes(
      normalizedCountry
    )
  ) {
    return false;
  }

  if (
    zone.states.length > 0 &&
    !zone.states.includes(normalizedState)
  ) {
    return false;
  }

  if (
    zone.cities.length > 0 &&
    !zone.cities.includes(normalizedCity)
  ) {
    return false;
  }

  if (
    zone.postalCodes.length > 0 &&
    !zone.postalCodes.includes(
      normalizedPostalCode
    )
  ) {
    return false;
  }

  return true;
};

const matchesRate = ({
  rate,
  orderValue,
  totalWeight,
}) => {
  const value = Number(orderValue || 0);
  const weight = Number(totalWeight || 0);

  if (
    rate.minimumOrderValue !== null &&
    rate.minimumOrderValue !== undefined &&
    value < rate.minimumOrderValue
  ) {
    return false;
  }

  if (
    rate.maximumOrderValue !== null &&
    rate.maximumOrderValue !== undefined &&
    value > rate.maximumOrderValue
  ) {
    return false;
  }

  if (
    rate.minimumWeight !== null &&
    rate.minimumWeight !== undefined &&
    weight < rate.minimumWeight
  ) {
    return false;
  }

  if (
    rate.maximumWeight !== null &&
    rate.maximumWeight !== undefined &&
    weight > rate.maximumWeight
  ) {
    return false;
  }

  return true;
};

const calculateShipping = async ({
  tenantId,
  country = "IN",
  state,
  city,
  postalCode,
  orderValue = 0,
  totalWeight = 0,
}) => {
  const zones =
    await ShippingZone.find({
      tenantId,
      isActive: true,
    })
      .sort({
        priority: -1,
      })
      .lean();

  const matchingZone = zones.find(
    (zone) =>
      matchesZone({
        zone,
        country,
        state,
        city,
        postalCode,
      })
  );

  if (!matchingZone) {
    throw createHttpError(
      404,
      "No shipping zone available for this address"
    );
  }

  const rates =
    await ShippingRate.find({
      tenantId,
      zoneId: matchingZone._id,
      isActive: true,
    })
      .sort({
        sortOrder: 1,
        amount: 1,
      })
      .lean();

  const applicableRates =
    rates.filter((rate) =>
      matchesRate({
        rate,
        orderValue,
        totalWeight,
      })
    );

  if (applicableRates.length === 0) {
    throw createHttpError(
      404,
      "No shipping method available for this order"
    );
  }

  const options = applicableRates.map(
    (rate) => {
      let shippingAmount =
        Number(rate.amount || 0);

      if (
        rate.method === "FREE"
      ) {
        shippingAmount = 0;
      }

      if (
        rate.freeShippingThreshold !==
          null &&
        rate.freeShippingThreshold !==
          undefined &&
        Number(orderValue) >=
          Number(
            rate.freeShippingThreshold
          )
      ) {
        shippingAmount = 0;
      }

      return {
        rateId: rate._id,
        name: rate.name,
        description:
          rate.description,
        method: rate.method,
        amount: shippingAmount,
        currency: "INR",
        estimatedDelivery: {
          minDays:
            rate.estimatedDeliveryMinDays,
          maxDays:
            rate.estimatedDeliveryMaxDays,
        },
      };
    }
  );

  return {
    zone: {
      id: matchingZone._id,
      name: matchingZone.name,
    },
    options,
  };
};

module.exports = {
  createShippingZone,
  getShippingZones,
  getShippingZoneById,
  updateShippingZone,
  deleteShippingZone,

  createShippingRate,
  getShippingRates,
  updateShippingRate,
  deleteShippingRate,

  calculateShipping,
};