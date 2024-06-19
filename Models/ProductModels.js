const mongoose = require("mongoose")

const productSchema = new mongoose.Schema(
  {
    item: {
      type: String,
      required: true,
    },

    price: {
      type: String,
      required: true,
    },

    quantity: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
)

const Product = mongoose.model("Product", productSchema, "Product")

module.exports = Product
