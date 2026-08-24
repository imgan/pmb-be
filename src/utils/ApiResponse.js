const sendResponse = (res, statusCode, { success = true, message = '', data, meta } = {}) => {
  const body = { success, message };
  if (data !== undefined) body.data = data;
  if (meta !== undefined) body.meta = meta;
  return res.status(statusCode).json(body);
};

module.exports = sendResponse;
