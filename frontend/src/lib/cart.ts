"use client";

import { api } from "@/lib/api";

// Cart mutation helpers. Every mutation broadcasts `cart:changed`, which the
// header listens to for the count badge — one contract, used by the detail
// page (add), the cart page (remove/clear), and checkout (paid = cleared).

export const CART_EVENT = "cart:changed";

export const notifyCartChanged = () => {
    if (typeof window !== "undefined") window.dispatchEvent(new Event(CART_EVENT));
};

export const addToCart = async (gameId: string) => {
    const result = await api.post<{ alreadyInCart?: boolean }>("/cart/items", { gameId });
    notifyCartChanged();
    return result;
};

export const removeFromCart = async (gameId: string) => {
    await api.delete(`/cart/items/${gameId}`);
    notifyCartChanged();
};

export const clearCart = async () => {
    await api.delete("/cart");
    notifyCartChanged();
};
