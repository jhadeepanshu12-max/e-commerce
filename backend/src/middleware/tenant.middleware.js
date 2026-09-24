const Tenant = require("../modules/tenants/tenant.model");

const requireTenant = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!req.user.tenantId) {
      return res.status(403).json({
        success: false,
        message: "This account is not associated with a tenant",
      });
    }

    const tenant = await Tenant.findById(req.user.tenantId);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    if (tenant.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Tenant is not active",
      });
    }

    req.tenant = tenant;
    req.tenantId = tenant._id;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requireTenant,
};