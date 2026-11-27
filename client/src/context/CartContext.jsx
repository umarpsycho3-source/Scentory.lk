import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('scentory_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [promotionalDeal, setPromotionalDeal] = useState(() => {
    try {
      const saved = localStorage.getItem('scentory_settings');
      if (saved) {
        const s = JSON.parse(saved);
        return s.promotionalDeal || null;
      }
    } catch (e) {}
    return null;
  });

  useEffect(() => {
    // Load promotional deal from store settings
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data && data.promotionalDeal) {
          setPromotionalDeal(data.promotionalDeal);
        }
      })
      .catch(() => {});

    const handleSettingsUpdate = (e) => {
      if (e.detail?.promotionalDeal) {
        setPromotionalDeal(e.detail.promotionalDeal);
      }
    };
    window.addEventListener('scentory-settings-updated', handleSettingsUpdate);

    let channel = null;
    try {
      channel = new BroadcastChannel('scentory_channel');
      channel.onmessage = (event) => {
        if (event.data?.type === 'SETTINGS_UPDATED' && event.data.settings?.promotionalDeal) {
          setPromotionalDeal(event.data.settings.promotionalDeal);
        }
      };
    } catch (e) {}

    return () => {
      window.removeEventListener('scentory-settings-updated', handleSettingsUpdate);
      if (channel) channel.close();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('scentory_cart', JSON.stringify(cart));
  }, [cart]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const addToCart = (product, selectedVariant, quantity = 1) => {
    if (!product || !selectedVariant) return;

    const unitPrice = selectedVariant.discountPrice || selectedVariant.price;

    setCart(prev => {
      const existingIndex = prev.findIndex(
        item => item.productId === product.id && item.variantId === selectedVariant.id
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            productName: product.name,
            image: product.images?.[0] || '',
            variantId: selectedVariant.id,
            variantSize: selectedVariant.size,
            originalPrice: selectedVariant.price,
            price: unitPrice,
            quantity: quantity,
            maxStock: selectedVariant.stock
          }
        ];
      }
    });

    showToast(`Added ${quantity}x ${product.name} (${selectedVariant.size}) to cart`);
  };

  const updateQuantity = (productId, variantId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId, variantId);
      return;
    }

    setCart(prev =>
      prev.map(item => {
        if (item.productId === productId && item.variantId === variantId) {
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId, variantId) => {
    setCart(prev =>
      prev.filter(item => !(item.productId === productId && item.variantId === variantId))
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const rawSubtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  let dealDiscount = 0;
  let freeItemsCount = 0;
  let itemsNeeded = 0;

  const isProductDealEligible = (productId) => {
    if (!promotionalDeal || !promotionalDeal.enabled) return false;
    if (promotionalDeal.appliesTo === 'all' || !promotionalDeal.appliesTo) return true;
    const applicable = Array.isArray(promotionalDeal.applicableProductIds)
      ? promotionalDeal.applicableProductIds.map(String)
      : [];
    return applicable.includes(String(productId));
  };

  if (promotionalDeal && promotionalDeal.enabled) {
    const buyQty = Math.max(1, parseInt(promotionalDeal.buyQty, 10) || 2);
    const freeQty = Math.max(1, parseInt(promotionalDeal.freeQty, 10) || 1);
    const groupSize = buyQty + freeQty;
    const appliesTo = promotionalDeal.appliesTo || 'all';
    const applicableProductIds = Array.isArray(promotionalDeal.applicableProductIds)
      ? promotionalDeal.applicableProductIds.map(String)
      : [];

    const eligibleItems = (appliesTo === 'specific' && applicableProductIds.length > 0)
      ? cart.filter(item => applicableProductIds.includes(String(item.productId)))
      : (appliesTo === 'specific' ? [] : cart);

    const totalEligibleCount = eligibleItems.reduce((acc, item) => acc + item.quantity, 0);

    if (totalEligibleCount >= groupSize) {
      const eligibleGroups = Math.floor(totalEligibleCount / groupSize);
      freeItemsCount = eligibleGroups * freeQty;

      // Expand all units in eligible items sorted ascending by unit price (cheapest items are free)
      const unitPrices = [];
      eligibleItems.forEach(item => {
        for (let i = 0; i < item.quantity; i++) {
          unitPrices.push(Number(item.price) || 0);
        }
      });
      unitPrices.sort((a, b) => a - b);

      for (let i = 0; i < Math.min(freeItemsCount, unitPrices.length); i++) {
        dealDiscount += unitPrices[i];
      }
    }

    // Items needed to activate next free item tier
    if (appliesTo !== 'specific' || applicableProductIds.length > 0) {
      const remainder = totalEligibleCount % groupSize;
      if (remainder === 0 && totalEligibleCount > 0) {
        itemsNeeded = buyQty;
      } else {
        itemsNeeded = groupSize - remainder;
      }
    }
  }

  const subtotal = rawSubtotal;
  const discountedSubtotal = Math.max(0, rawSubtotal - dealDiscount);
  const deliveryFee = cart.length === 0 ? 0 : 500;
  const finalTotal = discountedSubtotal + deliveryFee;

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      isCartOpen,
      setIsCartOpen,
      subtotal,
      dealDiscount,
      discountedSubtotal,
      freeItemsCount,
      itemsNeeded,
      promotionalDeal,
      isProductDealEligible,
      deliveryFee,
      finalTotal,
      totalItemCount,
      toastMessage
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
