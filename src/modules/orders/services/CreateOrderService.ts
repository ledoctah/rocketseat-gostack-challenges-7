import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Product from '@modules/products/infra/typeorm/entities/Product';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

interface IFormattedProduct {
  product_id: string;
  quantity: number;
  price: number;
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const formattedProducts: IFormattedProduct[] = [];

    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('User with supplied ID does not exists');
    }

    const storedProducts = await this.productsRepository.findAllById(products);

    products.forEach(product => {
      const productExists = storedProducts.find(item => item.id === product.id);

      if (!productExists) {
        throw new AppError(`Product with ID ${product.id} does not exists`);
      }

      if (productExists.quantity - product.quantity < 0) {
        throw new AppError(
          'Cannot order a product with a bigger quantity than available',
        );
      }

      const index = storedProducts.indexOf(productExists);

      storedProducts[index].quantity -= product.quantity;

      formattedProducts.push({
        product_id: productExists.id,
        price: productExists.price,
        quantity: product.quantity,
      });
    });

    const order = this.ordersRepository.create({
      customer,
      products: formattedProducts,
    });

    await this.productsRepository.updateQuantity(storedProducts);

    return order;
  }
}

export default CreateOrderService;
