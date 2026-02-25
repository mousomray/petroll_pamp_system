const { z } = require("zod");

const createProductFinancialStockSchema = z.object({
    productId: z.string().min(1),
    financialYearId: z.string().min(1),
    openingStock: z.coerce.number().min(0).optional(),
    totalPurchase: z.coerce.number().min(0).optional(),
    totalSale: z.coerce.number().min(0).optional()
});

const updateProductFinancialStockSchema = z.object({
    openingStock: z.number().min(0).optional(),
    totalPurchase: z.number().min(0).optional(),
    totalSale: z.number().min(0).optional()
});

module.exports = {
    createProductFinancialStockSchema,
    updateProductFinancialStockSchema
};