import { useEffect } from 'react';
import { createContext, ReactNode, useContext, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const previousCartRef = useRef<Product[]>();
  useEffect(() => {
    previousCartRef.current = cart;
  });
  //se prviousCartRef.current for null ou undefined, atribui cart, senão ao contrário
  const cartPreviousValue = previousCartRef.current ?? cart;
  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      const newCart = [...cart];
      const productAlreadyExists = newCart.find(product => product.id === productId);
      const stockAmount = await api.get<Stock>(`/stock/${productId}`)
        .then(({ data }) => data.amount);

      const currentAmount = productAlreadyExists ? productAlreadyExists.amount : 0;
      const amount = currentAmount + 1;
      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productAlreadyExists) {
        //toda alteração feita em um item da cópia irá refletir diretamente na cópia
        productAlreadyExists.amount = amount;
      } else {
        const { data } = await api.get<Product>(`/products/${productId}`);
        newCart.push({ ...data, amount: 1 })
      }
      setCart(newCart);      
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(product => product.id === productId);
      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);

      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if (amount <= 0) {
        return;
      }

      const stockAmount = await api.get<Stock>(`/stock/${productId}`)
        .then(({ data }) => data.amount);

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId);

      if (productExists) {
        productExists.amount = amount;
        setCart(updatedCart);        
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
