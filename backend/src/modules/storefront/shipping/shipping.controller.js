const shippingService = require("./shipping.service");

const createZone = async (
  req,
  res,
  next
) => {
  try {
    const zone =
      await shippingService.createShippingZone({
        tenantId: req.tenantId,
        name: req.body.name,
        description: req.body.description,
        countries: req.body.countries,
        states: req.body.states,
        cities: req.body.cities,
        postalCodes: req.body.postalCodes,
        priority: req.body.priority,
      });

    res.status(201).json({
      success: true,
      message:
        "Shipping zone created successfully",
      zone,
    });
  } catch (error) {
    next(error);
  }
};

const getZones = async (
  req,
  res,
  next
) => {
  try {
    const zones =
      await shippingService.getShippingZones({
        tenantId: req.tenantId,
        includeInactive:
          req.query.includeInactive ===
          "true",
      });

    res.status(200).json({
      success: true,
      zones,
    });
  } catch (error) {
    next(error);
  }
};

const getZone = async (
  req,
  res,
  next
) => {
  try {
    const zone =
      await shippingService.getShippingZoneById({
        tenantId: req.tenantId,
        zoneId: req.params.id,
      });

    res.status(200).json({
      success: true,
      zone,
    });
  } catch (error) {
    next(error);
  }
};

const updateZone = async (
  req,
  res,
  next
) => {
  try {
    const zone =
      await shippingService.updateShippingZone({
        tenantId: req.tenantId,
        zoneId: req.params.id,
        name: req.body.name,
        description:
          req.body.description,
        countries:
          req.body.countries,
        states: req.body.states,
        cities: req.body.cities,
        postalCodes:
          req.body.postalCodes,
        priority:
          req.body.priority,
        isActive:
          req.body.isActive,
      });

    res.status(200).json({
      success: true,
      message:
        "Shipping zone updated successfully",
      zone,
    });
  } catch (error) {
    next(error);
  }
};

const deleteZone = async (
  req,
  res,
  next
) => {
  try {
    await shippingService.deleteShippingZone({
      tenantId: req.tenantId,
      zoneId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message:
        "Shipping zone deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const createRate = async (
  req,
  res,
  next
) => {
  try {
    const rate =
      await shippingService.createShippingRate({
        tenantId: req.tenantId,
        zoneId: req.params.zoneId,
        name: req.body.name,
        description:
          req.body.description,
        method: req.body.method,
        amount: req.body.amount,
        freeShippingThreshold:
          req.body.freeShippingThreshold,
        minimumOrderValue:
          req.body.minimumOrderValue,
        maximumOrderValue:
          req.body.maximumOrderValue,
        minimumWeight:
          req.body.minimumWeight,
        maximumWeight:
          req.body.maximumWeight,
        estimatedDeliveryMinDays:
          req.body
            .estimatedDeliveryMinDays,
        estimatedDeliveryMaxDays:
          req.body
            .estimatedDeliveryMaxDays,
        sortOrder:
          req.body.sortOrder,
      });

    res.status(201).json({
      success: true,
      message:
        "Shipping rate created successfully",
      rate,
    });
  } catch (error) {
    next(error);
  }
};

const getRates = async (
  req,
  res,
  next
) => {
  try {
    const rates =
      await shippingService.getShippingRates({
        tenantId: req.tenantId,
        zoneId: req.params.zoneId,
        includeInactive:
          req.query.includeInactive ===
          "true",
      });

    res.status(200).json({
      success: true,
      rates,
    });
  } catch (error) {
    next(error);
  }
};

const updateRate = async (
  req,
  res,
  next
) => {
  try {
    const rate =
      await shippingService.updateShippingRate({
        tenantId: req.tenantId,
        rateId: req.params.id,
        name: req.body.name,
        description:
          req.body.description,
        method: req.body.method,
        amount: req.body.amount,
        freeShippingThreshold:
          req.body.freeShippingThreshold,
        minimumOrderValue:
          req.body.minimumOrderValue,
        maximumOrderValue:
          req.body.maximumOrderValue,
        minimumWeight:
          req.body.minimumWeight,
        maximumWeight:
          req.body.maximumWeight,
        estimatedDeliveryMinDays:
          req.body
            .estimatedDeliveryMinDays,
        estimatedDeliveryMaxDays:
          req.body
            .estimatedDeliveryMaxDays,
        sortOrder:
          req.body.sortOrder,
        isActive:
          req.body.isActive,
      });

    res.status(200).json({
      success: true,
      message:
        "Shipping rate updated successfully",
      rate,
    });
  } catch (error) {
    next(error);
  }
};

const deleteRate = async (
  req,
  res,
  next
) => {
  try {
    await shippingService.deleteShippingRate({
      tenantId: req.tenantId,
      rateId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message:
        "Shipping rate deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const calculate = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await shippingService.calculateShipping({
        tenantId: req.tenantId,
        country: req.body.country,
        state: req.body.state,
        city: req.body.city,
        postalCode:
          req.body.postalCode,
        orderValue:
          req.body.orderValue,
        totalWeight:
          req.body.totalWeight,
      });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createZone,
  getZones,
  getZone,
  updateZone,
  deleteZone,

  createRate,
  getRates,
  updateRate,
  deleteRate,

  calculate,
};