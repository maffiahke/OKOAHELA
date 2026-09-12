const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.loanProduct.updateMany({ data: { minSavings: 0 } })
  .then((r) => { console.log("minSavings=0 on " + r.count + " products"); return p.loanProduct.count({ where: { minSavings: { gt: 0 } } }); })
  .then((left) => { console.log("products still requiring savings: " + left); })
  .finally(() => p.$disconnect());
