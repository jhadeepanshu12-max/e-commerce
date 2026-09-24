const getCurrentTenant = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      tenant: req.tenant,
    },
  });
};

module.exports = {
  getCurrentTenant,
};