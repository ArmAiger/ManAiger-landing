const Joi = require("joi");
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().allow("", null),
  password: Joi.string().min(6).required(),
});
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});
const brandMatchCreateSchema = Joi.object({
  source: Joi.string().default("AiBrandMatchService"),
  brandName: Joi.string().required(),
  fitReason: Joi.string().required(),
  matchScore: Joi.number().integer().min(0).max(100).default(75),
});
const invoiceCreateSchema = Joi.object({
  dealId: Joi.string().uuid().allow(null),
  brandName: Joi.string().allow(null, ""),
  amount: Joi.number().positive().required(),
  currency: Joi.string().default("usd"),
  description: Joi.string().allow(null, ""),
  useStripeInvoice: Joi.boolean().default(false),
  dueDate: Joi.date().iso().allow(null),
  paymentTerms: Joi.string().valid('due_on_receipt', 'net_7', 'net_15', 'net_30', 'net_60').default('due_on_receipt'),
  footer: Joi.string().allow(null, ""),
  projectReference: Joi.string().allow(null, ""),
  // New BYOP fields
  paymentMethodType: Joi.string().valid('STRIPE_ADMIN', 'CUSTOM_LINK').default('STRIPE_ADMIN'),
  customPaymentLink: Joi.string().uri().allow(null, "").when('paymentMethodType', {
    is: 'CUSTOM_LINK',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  customPaymentInstructions: Joi.string().allow(null, "")
});
module.exports = {
  registerSchema,
  loginSchema,
  brandMatchCreateSchema,
  invoiceCreateSchema,
};
