export const getLowStockEmailTemplate = ({
  lowStockProducts,
}: {
  lowStockProducts: {
    name: string;
    slug: string;
    image: string | null;
    currentStock: number;
  }[];
}) => {
  return `<!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8">
    <title>Low Stock Alert</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
        }
        .container {
            background-color: #ffffff;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            padding-bottom: 20px;
        }
        .product {
            display: flex;
            align-items: center;
            border-bottom: 1px solid #dddddd;
            padding: 10px 0;
        }
        .product img {
            width: 50px;
            height: 50px;
            object-fit: cover;
            border-radius: 5px;
            margin-right: 20px;
        }
        .product-info {
            flex-grow: 1;
        }
        .product-info h2 {
            margin: 0;
            font-size: 18px;
            color: #333333;
        }
        .product-info p {
            margin: 5px 0 0;
            color: #777777;
        }
        .footer {
            text-align: center;
            padding-top: 20px;
            color: #777777;
            font-size: 12px;
        }
    </style>
    </head>
    <body>
    <div class="container">
        <div class="header">
            <h1>Low Stock Alert</h1>
            <p>The following products are low on stock:</p>
        </div>
        <div class="products-list">
            ${lowStockProducts
              .map(
                (product) => `
                <div class="product">
                    <img src="${product.image || "https://via.placeholder.com/50"}" alt="${product.name}" onerror="this.style.display='none'" />
                    <div class="product-info">
                        <h2>${product.name}</h2>
                        <p>Current Stock: <strong>${product.currentStock}</strong> </p>
                    </div>
                </div>
            `,
              )
              .join("")}
        </div>
    </div>
    </body>
    </html>`;
};
