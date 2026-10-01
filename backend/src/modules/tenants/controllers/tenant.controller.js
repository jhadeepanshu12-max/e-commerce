const ALLOWED_BUSINESS_TYPES = [
  "GENERAL",
  "CLOTHING",
  "ELECTRONICS",
  "GROCERY",
  "OTHER",
];

const ALLOWED_BRANDING_FIELDS = [
  "logoUrl",
  "faviconUrl",
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "backgroundColor",
  "textColor",
  "fontFamily",
  "borderRadius",
  "themeMode",
];

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

const getCurrentTenant = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      tenant: req.tenant,
    },
  });
};

const updateCurrentTenant = async (req, res, next) => {
  try {
    const tenant = req.tenant;
    const { name, businessType, branding } = req.body || {};

    if (name !== undefined) {
      const trimmedName = String(name).trim();

      if (trimmedName.length < 2 || trimmedName.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Business name must contain 2 to 100 characters",
        });
      }

      tenant.name = trimmedName;
    }

    if (businessType !== undefined) {
      if (!ALLOWED_BUSINESS_TYPES.includes(businessType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid business type",
        });
      }

      tenant.businessType = businessType;
    }

    if (branding !== undefined) {
      if (!branding || typeof branding !== "object" || Array.isArray(branding)) {
        return res.status(400).json({
          success: false,
          message: "Branding must be an object",
        });
      }

      const nextBranding = { ...(tenant.branding?.toObject?.() || tenant.branding || {}) };

      for (const field of ALLOWED_BRANDING_FIELDS) {
        if (branding[field] === undefined) continue;

        const value = String(branding[field]).trim();

        if (field.endsWith("Color") && !HEX_COLOR.test(value)) {
          return res.status(400).json({
            success: false,
            message: `${field} must be a valid 6-digit hex color`,
          });
        }

        if (field === "borderRadius" && !["SMALL", "MEDIUM", "LARGE", "ROUND"].includes(value)) {
          return res.status(400).json({
            success: false,
            message: "Invalid border radius",
          });
        }

        if (field === "themeMode" && !["LIGHT", "DARK", "SYSTEM"].includes(value)) {
          return res.status(400).json({
            success: false,
            message: "Invalid theme mode",
          });
        }

        nextBranding[field] = value;
      }

      tenant.branding = nextBranding;
    }

    await tenant.save();

    return res.status(200).json({
      success: true,
      message: "Store settings updated successfully",
      data: {
        tenant,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCurrentTenant,
  updateCurrentTenant,
};
