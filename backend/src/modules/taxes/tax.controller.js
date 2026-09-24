const taxService = require("./tax.service");

const createTaxRule = async (
  req,
  res,
  next
) => {
  try {
    const taxRule =
      await taxService.createTaxRule({
        tenantId: req.tenantId,
        ...req.body,
      });

    res.status(201).json({
      success: true,
      message: "Tax rule created successfully",
      taxRule,
    });
  } catch (error) {
    next(error);
  }
};

const getTaxRules = async (
  req,
  res,
  next
) => {
  try {
    const taxRules =
      await taxService.getTaxRules({
        tenantId: req.tenantId,
        includeInactive:
          req.query.includeInactive ===
          "true",
      });

    res.status(200).json({
      success: true,
      taxRules,
    });
  } catch (error) {
    next(error);
  }
};

const getTaxRule = async (
  req,
  res,
  next
) => {
  try {
    const taxRule =
      await taxService.getTaxRuleById({
        tenantId: req.tenantId,
        taxRuleId: req.params.id,
      });

    res.status(200).json({
      success: true,
      taxRule,
    });
  } catch (error) {
    next(error);
  }
};

const updateTaxRule = async (
  req,
  res,
  next
) => {
  try {
    const taxRule =
      await taxService.updateTaxRule({
        tenantId: req.tenantId,
        taxRuleId: req.params.id,
        ...req.body,
      });

    res.status(200).json({
      success: true,
      message: "Tax rule updated successfully",
      taxRule,
    });
  } catch (error) {
    next(error);
  }
};

const deleteTaxRule = async (
  req,
  res,
  next
) => {
  try {
    await taxService.deleteTaxRule({
      tenantId: req.tenantId,
      taxRuleId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: "Tax rule deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const calculateTax = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await taxService.calculateTax({
        tenantId: req.tenantId,
        ...req.body,
      });

    res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTaxRule,
  getTaxRules,
  getTaxRule,
  updateTaxRule,
  deleteTaxRule,
  calculateTax,
};