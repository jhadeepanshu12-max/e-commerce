import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import "./App.css";

import {
  getStorefront,
  getCategories,
  getProducts,
  getProductById,
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart as clearServerCart,
  createOrder,
  createPayment,
  verifyPayment,
  getCustomerOrders,
  cancelCustomerOrder,
  getCustomerNotifications,
  sendSupportMessage,
  markNotificationRead,
  customerSignup,
  customerLogin,
  saveCustomerSession,
  getStoredCustomer,
  logoutCustomer,
  getToken,
} from "./lib/api";

const TENANT_SLUG =
  import.meta.env.VITE_TENANT_SLUG || "nova-store";

const categoryIcons = ["✦", "◈", "◇", "✚", "✿", "◆", "◎", "✧"];

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const fallbackFeaturedProduct = {
  name: "Curated Product",
  category: "NOVA ESSENTIAL",
  price: 0,
};

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 28,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const panelBackdrop = {
  position: "fixed",
  inset: 0,
  zIndex: 300,
  background: "rgba(10, 10, 18, 0.38)",
  backdropFilter: "blur(5px)",
  WebkitBackdropFilter: "blur(5px)",
};

const drawerStyle = {
  position: "fixed",
  top: 0,
  right: 0,
  bottom: 0,
  zIndex: 301,
  width: "min(440px, 92vw)",
  background: "#ffffff",
  boxShadow: "-25px 0 80px rgba(17, 17, 24, 0.18)",
  display: "flex",
  flexDirection: "column",
};

const closeButtonStyle = {
  width: 42,
  height: 42,
  border: 0,
  borderRadius: 14,
  background: "#f3f3f7",
  color: "#17171d",
  cursor: "pointer",
  fontSize: 20,
};


const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), {
        once: true,
      });
      existingScript.addEventListener("error", () => resolve(false), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });

function App() {
  const [activePanel, setActivePanel] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [customerAuthenticated, setCustomerAuthenticated] = useState(
    () => Boolean(getToken())
  );
  const [customer, setCustomer] = useState(
    () => getStoredCustomer()
  );
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [search, setSearch] = useState("");
  const [wishlist, setWishlist] = useState([]);
  const [cart, setCart] = useState([]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [productDetailsLoading, setProductDetailsLoading] = useState(false);
  const [productDetailsError, setProductDetailsError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [placedOrder, setPlacedOrder] = useState(null);
  const [payment, setPayment] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [cancellingOrderId, setCancellingOrderId] = useState("");
  const [retryingOrderId, setRetryingOrderId] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportReplies, setSupportReplies] = useState([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportSending, setSupportSending] = useState(false);
  const [supportError, setSupportError] = useState("");
  const [supportNotice, setSupportNotice] = useState("");
  const [shippingAddress, setShippingAddress] = useState({
    fullName: "",
    phone: "",
    addressLine1: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  });

  const [tenant, setTenant] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [storeLoading, setStoreLoading] = useState(true);
  const [storeError, setStoreError] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("featured");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 24,
    total: 0,
    totalPages: 0,
  });

  const filteredProducts = useMemo(() => {
    const sorted = [...products];

    if (sortBy === "price-low") {
      sorted.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sortBy === "price-high") {
      sorted.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (sortBy === "newest") {
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );
    } else {
      sorted.sort((a, b) => Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)));
    }

    return sorted;
  }, [products, sortBy]);

  const featuredProduct = useMemo(
    () =>
      products.find(
        (product) => product.isFeatured
      ) ||
      products[0] ||
      fallbackFeaturedProduct,
    [products]
  );

  const displayCategories = useMemo(() => {
    if (categories.length) return categories;

    const seen = new Map();

    products.forEach((product) => {
      const category = product.categoryId;
      if (!category) return;

      const id = category?._id || category;
      const name = category?.name || category?.title;
      if (!id || !name || seen.has(String(id))) return;

      seen.set(String(id), {
        _id: id,
        name,
        slug: category?.slug || String(name).toLowerCase().replace(/\s+/g, '-'),
        icon: categoryIcons[seen.size % categoryIcons.length],
      });
    });

    return Array.from(seen.values());
  }, [categories, products]);

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const cartTotal = cart.reduce(
    (total, item) =>
      total + item.price * item.quantity,
    0
  );

  const isWishlistActive =
    wishlist.includes(
      featuredProduct._id ||
        featuredProduct.name
    );

  useEffect(() => {
    let cancelled = false;

    const loadStoreMeta = async () => {
      try {
        setStoreLoading(true);
        setStoreError("");

        const [tenantData, categoryData] = await Promise.all([
          getStorefront(TENANT_SLUG),
          getCategories(TENANT_SLUG),
        ]);

        if (cancelled) return;

        setTenant(tenantData);
        setCategories(
          (categoryData || []).map((category, index) => ({
            ...category,
            icon: categoryIcons[index % categoryIcons.length],
          }))
        );
      } catch (error) {
        if (!cancelled) {
          setStoreError(error?.message || "Unable to load store data.");
        }
      }
    };

    loadStoreMeta();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      try {
        setStoreLoading(true);
        setStoreError("");

        const productData = await getProducts({
          tenantSlug: TENANT_SLUG,
          page,
          limit: 24,
          search: debouncedSearch,
          categoryId: selectedCategoryId,
        });

        if (cancelled) return;

        setProducts(productData?.products || []);
        setPagination(
          productData?.pagination || {
            page,
            limit: 24,
            total: productData?.products?.length || 0,
            totalPages: productData?.products?.length ? 1 : 0,
          }
        );
      } catch (error) {
        if (!cancelled) {
          setStoreError(error?.message || "Unable to load products.");
          setProducts([]);
          setPagination({ page, limit: 24, total: 0, totalPages: 0 });
        }
      } finally {
        if (!cancelled) setStoreLoading(false);
      }
    };

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [page, selectedCategoryId, debouncedSearch]);

  const normalizeServerCart = (serverCart) => {
    const items = Array.isArray(serverCart?.items)
      ? serverCart.items
      : [];

    return items.map((item) => {
      const product =
        item.productId && typeof item.productId === "object"
          ? item.productId
          : item.product || {};

      const productId =
        typeof item.productId === "object"
          ? item.productId?._id
          : item.productId || product?._id;

      return {
        cartItemId: item._id,
        productId,
        name: product?.name || item.name || "Product",
        category:
          product?.categoryId?.name ||
          product?.category ||
          item.category ||
          "GENERAL",
        imageUrl:
          product?.images?.[0] ||
          item.imageUrl ||
          "",
        compareAtPrice: Number(
          product?.compareAtPrice ??
            item.compareAtPrice ??
            0
        ),
        price: Number(
          item.unitPrice ??
            item.price ??
            product?.price ??
            0
        ),
        quantity: Number(item.quantity || 0),
      };
    });
  };

  useEffect(() => {
    const savedWishlist =
      localStorage.getItem("nova_wishlist");

    if (savedWishlist) {
      try {
        setWishlist(JSON.parse(savedWishlist));
      } catch {
        localStorage.removeItem("nova_wishlist");
      }
    }

    if (customerAuthenticated) {
      let cancelled = false;

      const loadServerCart = async () => {
        try {
          const serverCart = await getCart();

          if (!cancelled) {
            setCart(normalizeServerCart(serverCart));
          }
        } catch (error) {
          if (!cancelled) {
            console.error(
              "Unable to load customer cart:",
              error
            );
          }
        }
      };

      loadServerCart();

      return () => {
        cancelled = true;
      };
    }

    const savedCart =
      localStorage.getItem("nova_cart");

    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {
        localStorage.removeItem("nova_cart");
      }
    }

    return undefined;
  }, [customerAuthenticated]);

  useEffect(() => {
    localStorage.setItem(
      "nova_wishlist",
      JSON.stringify(wishlist)
    );
  }, [wishlist]);

  useEffect(() => {
    if (!customerAuthenticated) {
      localStorage.setItem(
        "nova_cart",
        JSON.stringify(cart)
      );
    }
  }, [cart, customerAuthenticated]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setActivePanel(null);
        setMobileMenu(false);
        setSelectedProduct(null);
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleEscape
      );
  }, []);

  const closePanels = () => {
    setActivePanel(null);
    setMobileMenu(false);
  };

  const openAuthPanel = (mode = "login") => {
    setAuthMode(mode);
    setAuthError("");
    setAuthMessage("");
    setAuthForm({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    setActivePanel("auth");
    setMobileMenu(false);
  };

  const updateAuthField = (event) => {
    const { name, value } = event.target;

    setAuthForm((current) => ({
      ...current,
      [name]: value,
    }));

    setAuthError("");
    setAuthMessage("");
  };

  const mergeGuestCartAfterLogin = async (guestItems) => {
    if (!Array.isArray(guestItems) || guestItems.length === 0) {
      const serverCart = await getCart();
      setCart(normalizeServerCart(serverCart));
      return;
    }

    for (const item of guestItems) {
      if (!item?.productId) {
        continue;
      }

      await addToCart({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: Math.max(Number(item.quantity) || 1, 1),
      });
    }

    const serverCart = await getCart();
    setCart(normalizeServerCart(serverCart));
  };

  const handleCustomerLogin = async (event) => {
    event.preventDefault();

    const email = authForm.email.trim().toLowerCase();
    const password = authForm.password;

    if (!email || !password) {
      setAuthError("Please enter your email and password.");
      return;
    }

    const guestCart = customerAuthenticated
      ? []
      : [...cart];

    try {
      setAuthLoading(true);
      setAuthError("");
      setAuthMessage("");

      const result = await customerLogin({
        email,
        password,
        tenantSlug: TENANT_SLUG,
      });

      const authData = result?.data || result;

      if (!authData?.accessToken) {
        throw new Error(
          "Login succeeded but no customer session was returned."
        );
      }

      saveCustomerSession(authData);

      setCustomer(
        authData?.user ||
          authData?.customer ||
          getStoredCustomer()
      );

      setCustomerAuthenticated(true);

      if (guestCart.length > 0) {
        await mergeGuestCartAfterLogin(guestCart);
        localStorage.removeItem("nova_cart");
      } else {
        const serverCart = await getCart();
        setCart(normalizeServerCart(serverCart));
      }

      setAuthForm({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
      });

      setAuthMessage("Welcome back. Your account is ready.");
      setActivePanel(null);
    } catch (error) {
      setAuthError(
        error?.message ||
          "Unable to sign in. Please check your details and try again."
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCustomerSignup = async (event) => {
    event.preventDefault();

    const name = authForm.name.trim();
    const email = authForm.email.trim().toLowerCase();
    const password = authForm.password;
    const confirmPassword = authForm.confirmPassword;

    if (!name || !email || !password || !confirmPassword) {
      setAuthError("Please complete all required fields.");
      return;
    }

    if (password.length < 8) {
      setAuthError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setAuthError("Passwords do not match.");
      return;
    }

    try {
      setAuthLoading(true);
      setAuthError("");
      setAuthMessage("");

      const result = await customerSignup({
        name,
        email,
        password,
        tenantSlug: TENANT_SLUG,
      });

      const authData = result?.data || result;

      if (authData?.accessToken) {
        const guestCart = customerAuthenticated
          ? []
          : [...cart];

        saveCustomerSession(authData);

        setCustomer(
          authData?.user ||
            authData?.customer ||
            getStoredCustomer()
        );

        setCustomerAuthenticated(true);

        if (guestCart.length > 0) {
          await mergeGuestCartAfterLogin(guestCart);
          localStorage.removeItem("nova_cart");
        } else {
          const serverCart = await getCart();
          setCart(normalizeServerCart(serverCart));
        }

        setAuthMessage("Account created successfully.");
        setActivePanel(null);
      } else {
        setAuthMode("login");
        setAuthMessage(
          "Account created successfully. Please sign in to continue."
        );
      }

      setAuthForm({
        name: "",
        email,
        password: "",
        confirmPassword: "",
      });
    } catch (error) {
      setAuthError(
        error?.message ||
          "Unable to create your account. Please try again."
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCustomerLogout = () => {
    // Never expose an authenticated customer's cart as a guest cart.
    localStorage.removeItem("nova_cart");
    setCart([]);
    logoutCustomer();

    setCustomerAuthenticated(false);
    setCustomer(null);
    setActivePanel(null);
    setPlacedOrder(null);
    setPayment(null);
    setPaymentSuccess(false);
    setAuthError("");
    setAuthMessage("");
  };

  const openCustomerOrders = async () => {
    if (!customerAuthenticated) {
      openAuthPanel("login");
      return;
    }

    setOrdersError("");
    setOrdersLoading(true);
    setActivePanel("orders");

    try {
      const result = await getCustomerOrders({ page: 1, limit: 50 });
      setCustomerOrders(result?.orders || []);
    } catch (error) {
      setCustomerOrders([]);
      setOrdersError(
        error?.message || "Unable to load your orders. Please try again."
      );
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleCancelCustomerOrder = async (orderId) => {
    if (!orderId) return;

    try {
      setCancellingOrderId(orderId);
      setOrdersError("");
      const result = await cancelCustomerOrder(orderId);
      const updated = result?.order || result;

      setCustomerOrders((current) =>
        current.map((order) =>
          String(order._id) === String(orderId)
            ? { ...order, ...(updated || {}), status: updated?.status || "CANCELLED" }
            : order
        )
      );
    } catch (error) {
      setOrdersError(
        error?.message || "Unable to cancel this order."
      );
    } finally {
      setCancellingOrderId("");
    }
  };

  const handleRetryCustomerOrderPayment = async (order) => {
    if (!order?._id) return;

    try {
      setRetryingOrderId(order._id);
      setOrdersError("");
      setPaymentError("");
      setPaymentSuccess(false);

      // Keep the same order. The backend reuses its pending payment
      // and Razorpay order when one already exists.
      setPlacedOrder(order);
      await initiatePayment(order);
    } catch (error) {
      setOrdersError(
        error?.message || "Unable to retry this payment."
      );
    } finally {
      setRetryingOrderId("");
    }
  };

  const getSupportThreadStorageKey = () => {
    const customerId =
      customer?.id ||
      customer?._id ||
      customer?.email ||
      "guest";

    return `nova_support_thread_${customerId}`;
  };

  const getOrCreateSupportThreadId = () => {
    const storageKey = getSupportThreadStorageKey();
    let threadId = localStorage.getItem(storageKey);

    if (!threadId) {
      threadId =
        window.crypto?.randomUUID?.() ||
        `support-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(storageKey, threadId);
    }

    return threadId;
  };

  const loadSupportConversation = async () => {
    if (!customerAuthenticated) return;

    try {
      setSupportLoading(true);
      setSupportError("");

      const threadId = getOrCreateSupportThreadId();
      const result = await getCustomerNotifications({
        page: 1,
        limit: 100,
      });

      const conversation = (result?.notifications || [])
        .filter((notification) =>
          [
            "CUSTOMER_SUPPORT_SENT",
            "CUSTOMER_SUPPORT_REPLY",
          ].includes(notification?.event) &&
          notification?.data?.supportThreadId === threadId
        )
        .sort(
          (a, b) =>
            new Date(a.createdAt || 0).getTime() -
            new Date(b.createdAt || 0).getTime()
        );

      setSupportReplies(conversation);

      const unreadReplies = conversation.filter(
        (notification) =>
          notification?.event === "CUSTOMER_SUPPORT_REPLY" &&
          notification?.isRead === false
      );

      if (unreadReplies.length) {
        await Promise.allSettled(
          unreadReplies.map((notification) =>
            markNotificationRead(notification._id)
          )
        );
      }
    } catch (error) {
      setSupportError(
        error?.message ||
          "Unable to load your support conversation."
      );
    } finally {
      setSupportLoading(false);
    }
  };

  const openSupportPanel = async () => {
    if (!customerAuthenticated) {
      openAuthPanel("login");
      return;
    }

    setSupportError("");
    setSupportNotice("");
    setActivePanel("support");
    await loadSupportConversation();
  };

  const handleSupportSubmit = async (event) => {
    event.preventDefault();

    const message = supportMessage.trim();

    if (!customerAuthenticated) {
      openAuthPanel("login");
      return;
    }

    if (message.length < 2) {
      setSupportError(
        "Please enter at least 2 characters."
      );
      return;
    }

    if (message.length > 1000) {
      setSupportError("Please keep your message under 1000 characters.");
      return;
    }

    try {
      setSupportSending(true);
      setSupportError("");
      setSupportNotice("");

      const threadId = getOrCreateSupportThreadId();

      await sendSupportMessage({
        message,
        threadId,
      });

      setSupportMessage("");
      setSupportNotice(
        "Message sent. Our store team will reply here."
      );
      await loadSupportConversation();
    } catch (error) {
      setSupportError(
        error?.message ||
          "Unable to send your support message."
      );
    } finally {
      setSupportSending(false);
    }
  };

  const toggleAccountPanel = () => {
    if (!customerAuthenticated) {
      openAuthPanel("login");
      return;
    }

    setAuthError("");
    setAuthMessage("");
    setActivePanel("auth");
  };

  const toggleWishlist = (
    product = featuredProduct
  ) => {
    if (!product) return;

    const key =
      product._id || product.name;

    setWishlist((current) => {
      if (current.includes(key)) {
        return current.filter(
          (item) => item !== key
        );
      }

      return [...current, key];
    });
  };

  const openProductDetails = async (product) => {
    if (!product) return;

    setSelectedProduct(product);
    setSelectedImageIndex(0);
    setSelectedQuantity(1);
    setProductDetailsError("");
    setProductDetailsLoading(true);

    try {
      const fullProduct = await getProductById(
        TENANT_SLUG,
        product._id
      );

      if (fullProduct) {
        setSelectedProduct(fullProduct);
      }
    } catch (error) {
      setProductDetailsError(
        error?.message ||
          "Unable to load complete product details."
      );
    } finally {
      setProductDetailsLoading(false);
    }
  };

  const syncServerCart = async (serverCart) => {
    setCart(normalizeServerCart(serverCart));
  };

  const addProductToCart = async (product, openCart = true, quantity = 1) => {
    if (!product) return;

    if (customerAuthenticated) {
      try {
        const serverCart = await addToCart({
          productId: product._id,
          quantity: Math.max(1, Number(quantity) || 1),
        });

        await syncServerCart(serverCart);
      } catch (error) {
        setStoreError(
          error?.message ||
            "Unable to add product to your bag."
        );
        return;
      }
    } else {
      const key = product._id || product.name;

      setCart((current) => {
        const existing = current.find(
          (item) =>
            (item.productId ||
              item._id ||
              item.name) === key
        );

        if (existing) {
          return current.map((item) =>
            (item.productId ||
              item._id ||
              item.name) === key
              ? {
                  ...item,
                  quantity: item.quantity + Math.max(1, Number(quantity) || 1),
                }
              : item
          );
        }

        return [
          ...current,
          {
            productId: product._id,
            name: product.name,
            category:
              product.categoryId?.name ||
              product.category ||
              "GENERAL",
            imageUrl: product.images?.[0] || "",
            compareAtPrice: Number(product.compareAtPrice || 0),
            price: Number(product.price || 0),
            quantity: 1,
          },
        ];
      });
    }

    if (openCart) {
      setActivePanel("cart");
    }
  };

  const addFeaturedToCart = () => {
    addProductToCart(featuredProduct, true);
  };

  const updateCartQuantity = async (item, change) => {
    const productId =
      item.productId || item._id || item.name;
    const nextQuantity = Number(item.quantity || 0) + change;

    if (customerAuthenticated) {
      try {
        let serverCart;

        if (nextQuantity <= 0) {
          serverCart = await removeCartItem(item.cartItemId);
        } else {
          serverCart = await updateCartItem(
            item.cartItemId,
            nextQuantity
          );
        }

        await syncServerCart(serverCart);
      } catch (error) {
        setStoreError(
          error?.message ||
            "Unable to update your bag."
        );
      }

      return;
    }

    setCart((current) =>
      current
        .map((currentItem) =>
          (currentItem.productId ||
            currentItem._id ||
            currentItem.name) === productId
            ? {
                ...currentItem,
                quantity:
                  currentItem.quantity + change,
              }
            : currentItem
        )
        .filter((currentItem) => currentItem.quantity > 0)
    );
  };

  const handleCheckout = () => {
    if (!customerAuthenticated) {
      setStoreError("Please sign in before proceeding to checkout.");
      setActivePanel("cart");
      return;
    }

    if (!cart.length) {
      setStoreError("Your bag is empty.");
      return;
    }

    setCheckoutError("");
    setPlacedOrder(null);
    setActivePanel("checkout");
  };

  const updateShippingField = (event) => {
    const { name, value } = event.target;
    setShippingAddress((current) => ({
      ...current,
      [name]: value,
    }));
    setCheckoutError("");
  };

  const submitCheckout = async (event) => {
    event.preventDefault();
    setCheckoutError("");
    setPaymentError("");

    const requiredFields = [
      "fullName",
      "phone",
      "addressLine1",
      "city",
      "state",
      "postalCode",
      "country",
    ];

    const missing = requiredFields.some(
      (field) => !String(shippingAddress[field] || "").trim()
    );

    if (missing) {
      setCheckoutError("Please complete all shipping details.");
      return;
    }

    try {
      setCheckoutLoading(true);
      const order = await createOrder({ shippingAddress });
      setPlacedOrder(order);
      setPayment(null);
      setCart([]);
    } catch (error) {
      setCheckoutError(
        error?.message || "Unable to place your order. Please try again."
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  const initiatePayment = async (orderOverride = null) => {
    const targetOrder = orderOverride || placedOrder;

    if (!targetOrder?._id) {
      return;
    }

    try {
      setPaymentLoading(true);
      setPaymentError("");
      setPaymentSuccess(false);

      const paymentResult = await createPayment({
        orderId: targetOrder._id,
        provider: "RAZORPAY",
      });

      setPayment(paymentResult);

      const razorpayOrderId =
        paymentResult?.razorpayOrderId ||
        paymentResult?.razorpayOrder?.id ||
        paymentResult?.gatewayOrderId ||
        paymentResult?.orderId;

      const razorpayKeyId =
        paymentResult?.razorpayKeyId ||
        paymentResult?.keyId ||
        import.meta.env.VITE_RAZORPAY_KEY_ID;

      if (!razorpayOrderId) {
        throw new Error(
          "Payment session was created, but the Razorpay order is not available yet."
        );
      }

      if (!razorpayKeyId) {
        throw new Error(
          "Razorpay checkout key is not configured."
        );
      }

      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || !window.Razorpay) {
        throw new Error(
          "Unable to load Razorpay Checkout. Please check your internet connection and try again."
        );
      }

      const amount =
        Number(
          paymentResult?.amount ??
            targetOrder?.totalAmount ??
            targetOrder?.total ??
            0
        );

      const currency =
        paymentResult?.currency ||
        targetOrder?.currency ||
        "INR";

      const checkoutOptions = {
        key: razorpayKeyId,
        amount:
          paymentResult?.razorpayAmount ||
          paymentResult?.amountInPaise ||
          Math.round(amount * 100),
        currency,
        name:
          tenant?.name ||
          "Nova Store",
        description:
          `Order ${targetOrder?._id || ""}`.trim(),
        order_id: razorpayOrderId,
        prefill: {
          name:
            targetOrder?.shippingAddress?.fullName ||
            shippingAddress.fullName,
          contact:
            targetOrder?.shippingAddress?.phone ||
            shippingAddress.phone,
        },
        notes: {
          orderId: targetOrder?._id || "",
          tenantSlug: TENANT_SLUG,
        },
        theme: {
          color:
            tenant?.branding?.primaryColor ||
            "#6C5CE7",
        },
        handler: async (response) => {
          setPaymentProcessing(true);
          setPaymentError("");

          try {
            const verifiedPayment =
              await verifyPayment({
                paymentId:
                  paymentResult?._id ||
                  paymentResult?.id,
                razorpayOrderId:
                  response?.razorpay_order_id ||
                  razorpayOrderId,
                razorpayPaymentId:
                  response?.razorpay_payment_id,
                razorpaySignature:
                  response?.razorpay_signature,
                method: "",
                metadata: {
                  source: "storefront_razorpay_checkout",
                },
              });

            if (verifiedPayment?.status !== "PAID") {
              throw new Error(
                "Payment has not been confirmed yet. Please check your order before retrying."
              );
            }

            setPayment(verifiedPayment);
            setPaymentSuccess(true);
            setPlacedOrder((current) =>
              current
                ? {
                    ...current,
                    paymentStatus: "PAID",
                    status:
                      current.status === "PENDING_PAYMENT"
                        ? "CONFIRMED"
                        : current.status,
                  }
                : current
            );

            setCustomerOrders((current) =>
              current.map((order) =>
                String(order._id) === String(targetOrder._id)
                  ? {
                      ...order,
                      paymentStatus: "PAID",
                      status:
                        order.status === "PENDING_PAYMENT"
                          ? "CONFIRMED"
                          : order.status,
                    }
                  : order
              )
            );
          } catch (error) {
            setPaymentError(
              error?.message ||
                "Payment verification could not be completed."
            );
          } finally {
            setPaymentProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentProcessing(false);
          },
        },
      };

      const razorpay = new window.Razorpay(
        checkoutOptions
      );

      razorpay.on(
        "payment.failed",
        (response) => {
          setPaymentProcessing(false);
          setPaymentError(
            response?.error?.description ||
              "Payment failed. Please try again."
          );
        }
      );

      razorpay.open();
    } catch (error) {
      setPaymentError(
        error?.message ||
          "Unable to initialize payment. Please try again."
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  const clearCart = async () => {
    if (customerAuthenticated) {
      try {
        const serverCart = await clearServerCart();
        await syncServerCart(serverCart);
      } catch (error) {
        setStoreError(
          error?.message ||
            "Unable to clear your bag."
        );
      }

      return;
    }

    setCart([]);
  };

  const scrollTo = (id) => {
    closePanels();

    requestAnimationFrame(() => {
      document
        .getElementById(id)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    });
  };

  return (
    <main
      className="storefront"
      style={{
        "--tenant-primary":
          tenant?.branding?.primaryColor ||
          "#6C5CE7",
        "--tenant-secondary":
          tenant?.branding?.secondaryColor ||
          "#00B894",
        "--tenant-accent":
          tenant?.branding?.accentColor ||
          "#FD79A8",
        backgroundColor:
          tenant?.branding?.backgroundColor ||
          undefined,
        color:
          tenant?.branding?.textColor ||
          undefined,
      }}
    >
      {storeError && (
        <div
          style={{
            position: "fixed",
            top: 12,
            left: "50%",
            transform:
              "translateX(-50%)",
            zIndex: 999,
            padding: "10px 16px",
            borderRadius: 999,
            background: "#fff0f3",
            color: "#a52d4b",
            fontWeight: 700,
            boxShadow:
              "0 10px 30px rgba(0,0,0,.08)",
          }}
        >
          {storeError}
        </div>
      )}
      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <motion.header
        className="navbar-wrap"
        initial={{
          opacity: 0,
          y: -18,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <nav className="navbar">
          <button
            className="brand"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
            style={{
              border: 0,
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <motion.span
              className="brand-mark"
              whileHover={{
                rotate: 7,
              }}
            >
              N
            </motion.span>

            <span className="brand-name">
              {tenant?.name || "NOVA"}
            </span>
          </button>

          <div className="nav-links">
            <button
              onClick={() => scrollTo("shop")}
              className="nav-link-button"
            >
              Shop
            </button>

            <button
              onClick={() =>
                scrollTo("collections")
              }
              className="nav-link-button"
            >
              Collections
            </button>

            <button
              onClick={() =>
                scrollTo("trending")
              }
              className="nav-link-button"
            >
              Trending
            </button>

          </div>

          <div className="nav-actions">
            {/* CUSTOMER ACCOUNT */}
            {customerAuthenticated ? (
              <motion.button
                className="nav-account-button"
                onClick={toggleAccountPanel}
                whileHover={{
                  y: -2,
                  scale: 1.02,
                }}
                whileTap={{
                  scale: 0.96,
                }}
                style={{
                  border: 0,
                  borderRadius: 999,
                  padding: "10px 14px",
                  background: "#f3f0ff",
                  color: "#5d46c8",
                  cursor: "pointer",
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                  maxWidth: 150,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Hi,{" "}
                {(
                  customer?.name ||
                  customer?.fullName ||
                  customer?.email ||
                  "Customer"
                )
                  .split(" ")[0]
                  .slice(0, 14)}
              </motion.button>
            ) : (
              <>
                <motion.button
                  className="nav-account-button"
                  onClick={() => openAuthPanel("login")}
                  whileHover={{
                    y: -2,
                    scale: 1.02,
                  }}
                  whileTap={{
                    scale: 0.96,
                  }}
                  style={{
                    border: 0,
                    borderRadius: 999,
                    padding: "10px 14px",
                    background: "#111118",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  }}
                >
                  Sign in
                </motion.button>

                <motion.button
                  className="nav-account-button"
                  onClick={() => openAuthPanel("signup")}
                  whileHover={{
                    y: -2,
                    scale: 1.02,
                  }}
                  whileTap={{
                    scale: 0.96,
                  }}
                  style={{
                    border: "1px solid #e3e1eb",
                    borderRadius: 999,
                    padding: "9px 13px",
                    background: "#fff",
                    color: "#33333d",
                    cursor: "pointer",
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  }}
                >
                  Sign up
                </motion.button>
              </>
            )}

            {/* SEARCH */}
            <motion.button
              className="nav-icon"
              aria-label="Search"
              onClick={() =>
                setActivePanel("search")
              }
              whileHover={{
                scale: 1.06,
              }}
              whileTap={{
                scale: 0.94,
              }}
            >
              ⌕
            </motion.button>

            {/* WISHLIST */}
            <motion.button
              className="nav-icon"
              aria-label="Wishlist"
              onClick={() =>
                setActivePanel("wishlist")
              }
              style={{
                position: "relative",
              }}
              whileHover={{
                scale: 1.06,
              }}
              whileTap={{
                scale: 0.94,
              }}
            >
              {isWishlistActive ? "♥" : "♡"}

              {wishlist.length > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 5,
                    right: 5,
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background:
                      "#ef557c",
                  }}
                />
              )}
            </motion.button>

            {/* BAG */}
            <motion.button
              className="cart-button"
              onClick={() =>
                setActivePanel("cart")
              }
              whileHover={{
                y: -2,
                scale: 1.02,
              }}
              whileTap={{
                scale: 0.96,
              }}
            >
              <span>Bag</span>

              <strong>
                {cartCount}
              </strong>
            </motion.button>
          </div>

          <button
            className="mobile-menu"
            onClick={() =>
              setMobileMenu((current) => !current)
            }
            aria-label="Open menu"
          >
            {mobileMenu ? "×" : "☰"}
          </button>
        </nav>
      </motion.header>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {mobileMenu && (
          <>
            <motion.div
              style={panelBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePanels}
            />

            <motion.div
              initial={{
                opacity: 0,
                y: -15,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -15,
              }}
              transition={{
                duration: 0.2,
              }}
              style={{
                position: "fixed",
                top: 82,
                left: 12,
                right: 12,
                zIndex: 301,
                padding: 18,
                borderRadius: 22,
                background: "#fff",
                boxShadow:
                  "0 25px 60px rgba(17,17,24,.15)",
              }}
            >
              {[
                ["Shop", "shop"],
                [
                  "Collections",
                  "collections",
                ],
                ["Trending", "trending"],
              ].map(([label, id]) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  style={{
                    width: "100%",
                    padding: "15px 10px",
                    border: 0,
                    background: "transparent",
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#33333d",
                    cursor: "pointer",
                    borderBottom:
                      "1px solid #f0f0f4",
                  }}
                >
                  {label}
                </button>
              ))}

              {customerAuthenticated ? (
                <button
                  onClick={toggleAccountPanel}
                  style={{
                    width: "100%",
                    marginTop: 12,
                    padding: 15,
                    border: 0,
                    borderRadius: 14,
                    background: "#f3f0ff",
                    color: "#5d46c8",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  My account
                </button>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    marginTop: 12,
                  }}
                >
                  <button
                    onClick={() => openAuthPanel("login")}
                    style={{
                      padding: 14,
                      border: "1px solid #e5e3ef",
                      borderRadius: 14,
                      background: "#fff",
                      color: "#33333d",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Sign in
                  </button>

                  <button
                    onClick={() => openAuthPanel("signup")}
                    style={{
                      padding: 14,
                      border: 0,
                      borderRadius: 14,
                      background: "#111118",
                      color: "#fff",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Sign up
                  </button>
                </div>
              )}

              <button
                onClick={() =>
                  setActivePanel("cart")
                }
                style={{
                  width: "100%",
                  marginTop: 12,
                  padding: 15,
                  border: 0,
                  borderRadius: 14,
                  background: "#111118",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Open Bag · {cartCount}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* =====================================================
          HERO
      ===================================================== */}

      <section
        className="hero"
        id="shop"
      >
        <div className="hero-noise" />
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />

        <motion.div
          className="hero-content"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            className="eyebrow"
            variants={fadeUp}
          >
            <span className="eyebrow-dot" />
            THE NEW ERA OF COMMERCE
          </motion.div>

          <motion.h1 variants={fadeUp}>
            Everything
            <br />
            <span>
              worth wanting.
            </span>
          </motion.h1>

          <motion.p
            className="hero-description"
            variants={fadeUp}
          >
            Discover products, brands and
            experiences curated around the way
            you live.
          </motion.p>

          <motion.div
            className="hero-actions"
            variants={fadeUp}
          >
            <motion.button
              className="btn btn-primary hero-primary"
              onClick={() =>
                scrollTo("collections")
              }
              whileHover={{
                y: -4,
                scale: 1.02,
              }}
              whileTap={{
                scale: 0.97,
              }}
            >
              Explore collection
              <span>↗</span>
            </motion.button>

            <motion.button
              className="hero-play"
              onClick={() =>
                scrollTo("collections")
              }
              whileHover={{
                x: 4,
              }}
            >
              <span className="play-icon">
                ✦
              </span>

              <span>
                View collection
              </span>
            </motion.button>
          </motion.div>

          <motion.div
            className="hero-meta"
            variants={fadeUp}
          >
            <div>
              <strong>
                {storeLoading
                  ? "..."
                  : products.length}
              </strong>
              <span>Products loaded</span>
            </div>

            <div>
              <strong>
                {tenant ? "LIVE" : "..."}
              </strong>
              <span>Store status</span>
            </div>

            <div>
              <strong>
                {featuredProduct.stockQuantity ??
                  "—"}
              </strong>
              <span>Units available</span>
            </div>
          </motion.div>
        </motion.div>

        {/* HERO VISUAL */}
        <motion.div
          className="hero-visual"
          initial={{
            opacity: 0,
            x: 40,
            scale: 0.97,
          }}
          animate={{
            opacity: 1,
            x: 0,
            scale: 1,
          }}
          transition={{
            duration: 0.8,
            delay: 0.15,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />

          <motion.div
            className="product-stage"
            whileHover={{
              y: -5,
            }}
            transition={{
              duration: 0.25,
            }}
          >
            <div className="product-card-main">
              <div className="product-top">
                <span>FEATURED</span>

                <motion.button
                  onClick={() =>
                    toggleWishlist(
                      featuredProduct
                    )
                  }
                  aria-label="Add to wishlist"
                  whileHover={{
                    scale: 1.1,
                  }}
                  whileTap={{
                    scale: 0.9,
                  }}
                  style={{
                    color: isWishlistActive
                      ? "#ff6b8a"
                      : "#fff",
                  }}
                >
                  {isWishlistActive
                    ? "♥"
                    : "♡"}
                </motion.button>
              </div>

              <div className="product-art">
                <div className="product-halo" />

                {featuredProduct.images?.[0] ? (
                  <img
                    className="hero-featured-image"
                    src={featuredProduct.images[0]}
                    alt={featuredProduct.name}
                  />
                ) : (
                  <div className="product-object">
                    <div className="product-object-top" />
                    <div className="product-object-body" />
                    <div className="product-object-detail" />
                  </div>
                )}

                <span className="floating-label label-one">
                  {featuredProduct.isFeatured ? "FEATURED" : "NEW"}
                </span>

                <span className="floating-label label-two">
                  01
                </span>
              </div>

              <div className="product-info">
                <div>
                  <span className="product-category">
                    {featuredProduct.categoryId
                      ?.name ||
                      featuredProduct.category ||
                      "NOVA ESSENTIAL"}
                  </span>

                  <h3>
                    {featuredProduct.name}
                  </h3>
                </div>

                <strong>
                  ₹
                  {Number(
                    featuredProduct.price || 0
                  ).toLocaleString("en-IN")}
                </strong>
              </div>
            </div>

            <motion.button
              className="floating-card floating-card-top"
              onClick={addFeaturedToCart}
              whileHover={{
                y: -5,
              }}
              whileTap={{
                scale: 0.97,
              }}
              style={{
                border: 0,
                cursor: "pointer",
              }}
            >
              <span className="floating-icon">
                ✦
              </span>

              <div>
                <strong>
                  Curated for you
                </strong>

                <small>
                  Featured selection
                </small>
              </div>
            </motion.button>

            <motion.button
              className="floating-card floating-card-bottom"
              onClick={() =>
                setActivePanel("wishlist")
              }
              whileHover={{
                y: -5,
              }}
              whileTap={{
                scale: 0.97,
              }}
              style={{
                border: 0,
                cursor: "pointer",
              }}
            >
              <span className="mini-rating">
                ★
              </span>

              <div>
                <strong>
                  4.9 / 5
                </strong>

                <small>
                  2,184 reviews
                </small>
              </div>
            </motion.button>
          </motion.div>
        </motion.div>

        <div className="scroll-indicator">
          <span />
          Scroll to explore
        </div>
      </section>

      {/* =====================================================
          TRUST
      ===================================================== */}

      <motion.section
        className="trust-bar"
        initial="hidden"
        whileInView="visible"
        viewport={{
          once: true,
          amount: 0.2,
        }}
        variants={stagger}
      >
        {[
          ["✦", "Curated collections"],
          ["◈", "Verified products"],
          ["↗", "Fast delivery"],
          ["♡", "Loved by customers"],
        ].map(([icon, text]) => (
          <motion.div
            className="trust-item"
            variants={fadeUp}
            key={text}
          >
            <span>{icon}</span>
            <p>{text}</p>
          </motion.div>
        ))}
      </motion.section>

      {/* =====================================================
          CATEGORIES
      ===================================================== */}

      <motion.section
        className="section categories-section"
        id="collections"
        initial="hidden"
        whileInView="visible"
        viewport={{
          once: true,
          amount: 0.12,
        }}
      >
        <motion.div
          className="section-heading"
          variants={fadeUp}
        >
          <div>
            <span className="section-kicker">
              EXPLORE
            </span>

            <h2>
              Shop your world.
            </h2>
          </div>

          <button
            className="section-link"
            onClick={() =>
              setActivePanel("search")
            }
            style={{
              border: 0,
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Search all <span>↗</span>
          </button>
        </motion.div>

        <motion.div
          className="category-grid"
          variants={stagger}
        >
          {displayCategories.map(
            (category, index) => (
              <motion.button
                className={`category-card category-card-${
                  index + 1
                }`}
                key={category.name}
                variants={fadeUp}
                whileHover={{
                  y: -7,
                  scale: 1.01,
                }}
                whileTap={{
                  scale: 0.985,
                }}
                onClick={() => {
                  setSearch("");
                  setPage(1);
                  setSelectedCategoryId(
                    category._id
                  );
                  scrollTo("trending");
                }}
              >
                <span className="category-icon">
                  {category.icon}
                </span>

                <div>
                  <span>
                    0{index + 1}
                  </span>

                  <h3>
                    {category.name}
                  </h3>
                </div>

                <span className="category-arrow">
                  ↗
                </span>
              </motion.button>
            )
          )}
        </motion.div>
      </motion.section>

      {/* =====================================================
          PRODUCT CATALOGUE
      ===================================================== */}

      <motion.section
        className="section"
        id="trending"
        initial="hidden"
        whileInView="visible"
        viewport={{
          once: true,
          amount: 0.08,
        }}
        variants={stagger}
        style={{
          paddingTop: 40,
          paddingBottom: 110,
        }}
      >
        <motion.div
          className="section-heading"
          variants={fadeUp}
          style={{
            alignItems: "flex-end",
          }}
        >
          <div>
            <span className="section-kicker">
              SHOP THE CATALOGUE
            </span>

            <h2>
              Products worth{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg,var(--tenant-primary,#6C5CE7),var(--tenant-secondary,#00B894),var(--tenant-accent,#FD79A8))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                adding to your bag.
              </span>
            </h2>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            {selectedCategoryId && (
              <button
                onClick={() => {
                  setPage(1);
                  setSelectedCategoryId("");
                }}
                style={{
                  border: 0,
                  borderRadius: 999,
                  padding: "10px 14px",
                  background: "#f1efff",
                  color: "#5d46c8",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Clear filter ×
              </button>
            )}

            <span
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                background: "#f5f5f8",
                color: "#666673",
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              {pagination.total}{" "}
              {pagination.total === 1
                ? "product"
                : "products"}
            </span>
          </div>
        </motion.div>

        <motion.div
          variants={fadeUp}
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            marginTop: 22,
            padding: 12,
            borderRadius: 20,
            background: "#f8f8fb",
            border: "1px solid #ececf2",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 900, color: "#777783", letterSpacing: ".08em" }}>
              FILTER
            </span>

            <select
              value={selectedCategoryId}
              onChange={(event) => {
                setPage(1);
                setSelectedCategoryId(event.target.value);
              }}
              style={{
                border: "1px solid #e4e4eb",
                borderRadius: 12,
                padding: "10px 34px 10px 12px",
                background: "#fff",
                fontWeight: 700,
                color: "#2b2b35",
                outline: "none",
              }}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setActivePanel("search")}
              style={{
                border: "1px solid #e4e4eb",
                borderRadius: 12,
                padding: "10px 14px",
                background: "#fff",
                fontWeight: 700,
                color: "#2b2b35",
                cursor: "pointer",
              }}
            >
              ⌕ {search ? `Search: ${search}` : "Search products"}
            </button>
          </div>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            style={{
              border: "1px solid #e4e4eb",
              borderRadius: 12,
              padding: "10px 34px 10px 12px",
              background: "#fff",
              fontWeight: 700,
              color: "#2b2b35",
              outline: "none",
            }}
          >
            <option value="featured">Sort: Featured</option>
            <option value="newest">Sort: Newest</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </motion.div>

        {storeLoading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill,minmax(240px,1fr))",
              gap: 20,
              marginTop: 28,
            }}
          >
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                style={{
                  height: 390,
                  borderRadius: 28,
                  background:
                    "linear-gradient(110deg,#f1f1f5 8%,#fafafd 18%,#f1f1f5 33%)",
                  backgroundSize: "200% 100%",
                  opacity: 0.72,
                }}
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <motion.div
            variants={fadeUp}
            style={{
              marginTop: 28,
              padding: "64px 24px",
              borderRadius: 30,
              background:
                "linear-gradient(135deg,#f7f5ff,#f3fbfa)",
              border: "1px solid #eceaf4",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                margin: "0 auto 16px",
                display: "grid",
                placeItems: "center",
                borderRadius: 20,
                background: "#fff",
                boxShadow:
                  "0 14px 35px rgba(30,25,70,.08)",
                fontSize: 26,
              }}
            >
              ⌕
            </div>

            <h3
              style={{
                margin: 0,
                fontSize: 24,
              }}
            >
              No products found
            </h3>

            <p
              style={{
                maxWidth: 500,
                margin: "10px auto 0",
                color: "#777783",
                lineHeight: 1.6,
              }}
            >
              Try another search or clear the
              category filter to explore the full
              catalogue.
            </p>

            <button
              className="btn btn-primary"
              onClick={() => {
                setSearch("");
                setPage(1);
                setSelectedCategoryId("");
              }}
              style={{
                marginTop: 18,
              }}
            >
              Show all products
            </button>
          </motion.div>
        ) : (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill,minmax(240px,1fr))",
              gap: 20,
              marginTop: 28,
            }}
          >
            {filteredProducts.map((product, index) => {
              const productKey = product._id || product.name;
              const productInWishlist = wishlist.includes(productKey);
              const imageUrl = product.images?.[0] || "";
              const categoryName = product.categoryId?.name || product.category || "General";
              const price = Number(product.price || 0);
              const compareAtPrice = Number(product.compareAtPrice || 0);
              const discount = compareAtPrice > price && compareAtPrice > 0
                ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
                : 0;
              const soldOut = product.stockQuantity === 0 && !product.allowBackorder;

              return (
                <motion.article
                  key={productKey}
                  className="catalog-product-card"
                  variants={fadeUp}
                  whileHover={{ y: -8 }}
                  onClick={() => openProductDetails(product)}
                >
                  <div className="catalog-product-media">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="catalog-product-image"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                          event.currentTarget.nextElementSibling?.classList.add("is-visible");
                        }}
                      />
                    ) : null}

                    <div className={`catalog-product-fallback ${imageUrl ? "" : "is-visible"}`} aria-hidden="true">
                      <span>✦</span>
                    </div>

                    <div className="catalog-product-overlay" />

                    <div className="catalog-product-badges">
                      {discount > 0 && <span className="catalog-badge catalog-badge-sale">-{discount}%</span>}
                      {product.isFeatured && <span className="catalog-badge catalog-badge-featured">Featured</span>}
                      {soldOut && <span className="catalog-badge catalog-badge-sold">Sold out</span>}
                    </div>

                    <button
                      className={`catalog-wishlist ${productInWishlist ? "active" : ""}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleWishlist(product);
                      }}
                      aria-label={productInWishlist ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      {productInWishlist ? "♥" : "♡"}
                    </button>

                    <div className="catalog-quick-view">
                      <span>View product</span>
                      <span>↗</span>
                    </div>
                  </div>

                  <div className="catalog-product-content">
                    <div className="catalog-product-meta">
                      <span>{categoryName}</span>
                      {!soldOut && product.stockQuantity !== undefined && product.stockQuantity <= 5 && (
                        <span className="catalog-low-stock">Only {product.stockQuantity} left</span>
                      )}
                    </div>

                    <h3 className="catalog-product-title">{product.name}</h3>

                    <p className="catalog-product-description">
                      {product.shortDescription || "A curated product for your store."}
                    </p>

                    <div className="catalog-product-bottom">
                      <div className="catalog-price-wrap">
                        <strong>₹{price.toLocaleString("en-IN")}</strong>
                        {compareAtPrice > price && <span>₹{compareAtPrice.toLocaleString("en-IN")}</span>}
                      </div>

                      <motion.button
                        className={`catalog-add-button ${soldOut ? "disabled" : ""}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          addProductToCart(product, true);
                        }}
                        disabled={soldOut}
                        whileHover={soldOut ? undefined : { scale: 1.04 }}
                        whileTap={soldOut ? undefined : { scale: 0.96 }}
                      >
                        <span>{soldOut ? "Sold out" : "Add to bag"}</span>
                        {!soldOut && <span>+</span>}
                      </motion.button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        )}

        {!storeLoading && pagination.totalPages > 1 && (
          <motion.div
            variants={fadeUp}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginTop: 30,
              flexWrap: "wrap",
            }}
          >
            <button
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              style={{
                border: "1px solid #e4e4eb",
                borderRadius: 12,
                padding: "10px 14px",
                background: page <= 1 ? "#f1f1f4" : "#fff",
                color: page <= 1 ? "#aaaab3" : "#17171d",
                fontWeight: 800,
                cursor: page <= 1 ? "not-allowed" : "pointer",
              }}
            >
              ← Prev
            </button>

            <span
              style={{
                minWidth: 110,
                textAlign: "center",
                padding: "10px 14px",
                borderRadius: 12,
                background: "#f3f1ff",
                color: "#5d46c8",
                fontWeight: 900,
              }}
            >
              Page {pagination.page} / {pagination.totalPages}
            </span>

            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
              style={{
                border: "1px solid #e4e4eb",
                borderRadius: 12,
                padding: "10px 14px",
                background: page >= pagination.totalPages ? "#f1f1f4" : "#111118",
                color: page >= pagination.totalPages ? "#aaaab3" : "#fff",
                fontWeight: 800,
                cursor: page >= pagination.totalPages ? "not-allowed" : "pointer",
              }}
            >
              Next →
            </button>
          </motion.div>
        )}
      </motion.section>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="footer">
        <div className="footer-brand">
          <div className="brand">
            <span className="brand-mark">
              N
            </span>

            <span className="brand-name">
              {tenant?.name || "NOVA"}
            </span>
          </div>

          <p>
            Commerce, reimagined for modern
            brands.
          </p>
        </div>

        <div className="footer-links">
          <button
            onClick={() => scrollTo("shop")}
          >
            Shop
          </button>

          <button
            onClick={() =>
              scrollTo("collections")
            }
          >
            Collections
          </button>

          <button onClick={toggleAccountPanel}>
            {customerAuthenticated ? "Account" : "Sign in"}
          </button>

          <button onClick={openSupportPanel}>
            Support
          </button>
        </div>

        <span className="footer-copy">
          © 2026 NOVA Commerce
        </span>
      </footer>

      {/* =====================================================
          PRODUCT DETAILS
      ===================================================== */}

      <AnimatePresence>
        {selectedProduct && (
          <>
            <motion.div
              style={panelBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
            />

            <motion.div
              className="product-detail-modal"
              initial={{ opacity: 0, y: 35, x: "-50%", scale: 0.98 }}
              animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
              exit={{ opacity: 0, y: 35, x: "-50%", scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "fixed",
                top: "5vh",
                left: "50%",
                bottom: "5vh",
                width: "min(1080px, calc(100% - 28px))",
                zIndex: 302,
                overflow: "auto",
                borderRadius: 32,
                background: "#fff",
                boxShadow: "0 35px 100px rgba(17,17,24,.24)",
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                  display: "flex",
                  justifyContent: "flex-end",
                  padding: 16,
                  marginBottom: -66,
                  pointerEvents: "none",
                }}
              >
                <button
                  onClick={() => setSelectedProduct(null)}
                  style={{
                    ...closeButtonStyle,
                    pointerEvents: "auto",
                    background: "rgba(255,255,255,.92)",
                    boxShadow: "0 10px 30px rgba(0,0,0,.1)",
                  }}
                  aria-label="Close product details"
                >
                  ×
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, .95fr)",
                  minHeight: 560,
                }}
              >
                <div
                  style={{
                    padding: 24,
                    background: "linear-gradient(145deg,#f0edff,#e3f8f3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 500,
                  }}
                >
                  <div className="product-detail-gallery">
                    <div className="product-detail-image-wrap">
                      {selectedProduct.images?.[selectedImageIndex] ? (
                        <img
                          src={selectedProduct.images[selectedImageIndex]}
                          alt={selectedProduct.name}
                          className="product-detail-image"
                        />
                      ) : (
                        <div className="product-detail-fallback" />
                      )}
                    </div>

                    {Array.isArray(selectedProduct.images) && selectedProduct.images.length > 1 && (
                      <div className="product-detail-thumbs">
                        {selectedProduct.images.map((image, index) => (
                          <button
                            key={`${image}-${index}`}
                            type="button"
                            className={`product-detail-thumb ${selectedImageIndex === index ? "active" : ""}`}
                            onClick={() => setSelectedImageIndex(index)}
                            aria-label={`View product image ${index + 1}`}
                          >
                            <img src={image} alt="" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    padding: "54px 34px 34px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <span
                    style={{
                      color: "#7650dc",
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: ".12em",
                      textTransform: "uppercase",
                    }}
                  >
                    {selectedProduct.categoryId?.name || selectedProduct.category || "GENERAL"}
                  </span>

                  <h2
                    style={{
                      margin: "10px 0 8px",
                      fontSize: "clamp(28px, 4vw, 44px)",
                      lineHeight: 1.02,
                      letterSpacing: "-.045em",
                    }}
                  >
                    {selectedProduct.name}
                  </h2>

                  <p
                    style={{
                      margin: 0,
                      color: "#777783",
                      lineHeight: 1.65,
                    }}
                  >
                    {selectedProduct.shortDescription ||
                      selectedProduct.description ||
                      "A curated product for your store."}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 10,
                      marginTop: 22,
                    }}
                  >
                    <strong style={{ fontSize: 30 }}>
                      ₹{Number(selectedProduct.price || 0).toLocaleString("en-IN")}
                    </strong>

                    {selectedProduct.compareAtPrice > selectedProduct.price && (
                      <span
                        style={{
                          color: "#9999a3",
                          textDecoration: "line-through",
                        }}
                      >
                        ₹{Number(selectedProduct.compareAtPrice).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      marginTop: 18,
                    }}
                  >
                    <span
                      style={{
                        padding: "8px 11px",
                        borderRadius: 999,
                        background: selectedProduct.stockQuantity > 0 ? "#e8faf3" : "#fff0f3",
                        color: selectedProduct.stockQuantity > 0 ? "#16865c" : "#c23c58",
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {selectedProduct.stockQuantity > 0
                        ? `${selectedProduct.stockQuantity} in stock`
                        : selectedProduct.allowBackorder
                        ? "Available on backorder"
                        : "Sold out"}
                    </span>

                    {selectedProduct.isFeatured && (
                      <span
                        style={{
                          padding: "8px 11px",
                          borderRadius: 999,
                          background: "#f1edff",
                          color: "#6845c5",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        Featured
                      </span>
                    )}
                  </div>

                  {selectedProduct.attributes &&
                    Object.keys(selectedProduct.attributes).length > 0 && (
                    <div style={{ marginTop: 28 }}>
                      <h4 style={{ margin: "0 0 12px", fontSize: 14 }}>
                        Product details
                      </h4>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                          gap: 9,
                        }}
                      >
                        {Object.entries(selectedProduct.attributes).map(([key, value]) => (
                          <div
                            key={key}
                            style={{
                              padding: 11,
                              borderRadius: 14,
                              background: "#f7f7fa",
                            }}
                          >
                            <small
                              style={{
                                display: "block",
                                color: "#9999a3",
                                fontSize: 10,
                                fontWeight: 800,
                                textTransform: "uppercase",
                                letterSpacing: ".08em",
                              }}
                            >
                              {key}
                            </small>
                            <strong style={{ fontSize: 13 }}>
                              {String(value)}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {productDetailsLoading && (
                    <p
                      style={{
                        marginTop: 18,
                        color: "#7650dc",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      Loading full product details…
                    </p>
                  )}

                  {productDetailsError && (
                    <p
                      style={{
                        marginTop: 18,
                        color: "#c23c58",
                        fontSize: 13,
                      }}
                    >
                      {productDetailsError}
                    </p>
                  )}

                  <div className="product-detail-purchase">
                    <div className="product-detail-quantity-row">
                      <span>Quantity</span>
                      <div className="product-detail-quantity">
                        <button
                          type="button"
                          onClick={() => setSelectedQuantity((value) => Math.max(1, value - 1))}
                          disabled={selectedQuantity <= 1}
                          aria-label="Decrease quantity"
                        >−</button>
                        <strong>{selectedQuantity}</strong>
                        <button
                          type="button"
                          onClick={() => {
                            const max = selectedProduct.stockQuantity > 0 ? selectedProduct.stockQuantity : 99;
                            setSelectedQuantity((value) => Math.min(max, value + 1));
                          }}
                          disabled={selectedProduct.stockQuantity > 0 && selectedQuantity >= selectedProduct.stockQuantity}
                          aria-label="Increase quantity"
                        >+</button>
                      </div>
                    </div>

                    <div className="product-detail-action-row">
                    <button
                      onClick={() => toggleWishlist(selectedProduct)}
                      style={{
                        width: 54,
                        border: "1px solid #e6e6ed",
                        borderRadius: 16,
                        background: "#fff",
                        color: wishlist.includes(selectedProduct._id) ? "#ef557c" : "#17171d",
                        fontSize: 21,
                        cursor: "pointer",
                      }}
                      aria-label="Toggle wishlist"
                    >
                      {wishlist.includes(selectedProduct._id) ? "♥" : "♡"}
                    </button>

                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        addProductToCart(selectedProduct, true, selectedQuantity);
                        setSelectedProduct(null);
                        setSelectedQuantity(1);
                      }}
                      disabled={
                        selectedProduct.stockQuantity === 0 &&
                        !selectedProduct.allowBackorder
                      }
                      style={{
                        flex: 1,
                        minHeight: 54,
                      }}
                    >
                      {selectedProduct.stockQuantity === 0 &&
                      !selectedProduct.allowBackorder
                        ? "Sold out"
                        : `Add ${selectedQuantity} to bag`}
                      <span>→</span>
                    </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>


      {/* =====================================================
          CUSTOMER AUTH / ACCOUNT PANEL
      ===================================================== */}

      <AnimatePresence>
        {activePanel === "auth" && (
          <>
            <motion.div
              style={panelBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePanels}
            />

            <motion.aside
              style={{
                ...drawerStyle,
                width: "min(470px, 94vw)",
              }}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{
                duration: 0.25,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <div
                style={{
                  padding: 24,
                  borderBottom: "1px solid #eeeeF3",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <small
                    style={{
                      color: "#7650dc",
                      fontWeight: 900,
                      letterSpacing: ".12em",
                    }}
                  >
                    NOVA ACCOUNT
                  </small>

                  <h2
                    style={{
                      margin: "7px 0 0",
                      fontFamily: "Manrope, sans-serif",
                      letterSpacing: "-.04em",
                    }}
                  >
                    {customerAuthenticated
                      ? "Your account"
                      : authMode === "login"
                        ? "Welcome back"
                        : "Create your account"}
                  </h2>
                </div>

                <button
                  onClick={closePanels}
                  style={closeButtonStyle}
                >
                  ×
                </button>
              </div>

              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: 24,
                }}
              >
                {customerAuthenticated ? (
                  <div>
                    <div
                      style={{
                        padding: 22,
                        borderRadius: 24,
                        background:
                          "linear-gradient(135deg,#f3efff,#e9fbf7,#fff0f5)",
                        border: "1px solid #ece8f6",
                      }}
                    >
                      <div
                        style={{
                          width: 62,
                          height: 62,
                          display: "grid",
                          placeItems: "center",
                          borderRadius: 20,
                          background: "#111118",
                          color: "#fff",
                          fontSize: 22,
                          fontWeight: 900,
                          marginBottom: 16,
                        }}
                      >
                        {(
                          customer?.name ||
                          customer?.email ||
                          "C"
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <h3
                        style={{
                          margin: 0,
                          fontSize: 23,
                          letterSpacing: "-.03em",
                        }}
                      >
                        {customer?.name ||
                          "Customer"}
                      </h3>

                      <p
                        style={{
                          margin: "7px 0 0",
                          color: "#777783",
                          wordBreak: "break-word",
                        }}
                      >
                        {customer?.email || ""}
                      </p>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: 10,
                        marginTop: 18,
                      }}
                    >
                      {[
                        ["My orders", "Track your purchases"],
                        ["Wishlist", `${wishlist.length} saved item${wishlist.length === 1 ? "" : "s"}`],
                        ["Shopping bag", `${cartCount} item${cartCount === 1 ? "" : "s"}`],
                      ].map(([title, subtitle]) => (
                        <button
                          key={title}
                          type="button"
                          onClick={
                            title === "My orders"
                              ? openCustomerOrders
                              : title === "Shopping bag"
                                ? () => setActivePanel("cart")
                                : undefined
                          }
                          style={{
                            width: "100%",
                            padding: 16,
                            border: "1px solid #ececf2",
                            borderRadius: 16,
                            background: "#fff",
                            textAlign: "left",
                            cursor: title === "Wishlist" ? "default" : "pointer",
                          }}
                        >
                          <strong
                            style={{
                              display: "block",
                              color: "#22222b",
                            }}
                          >
                            {title}
                          </strong>

                          <span
                            style={{
                              display: "block",
                              marginTop: 4,
                              color: "#858590",
                              fontSize: 12,
                            }}
                          >
                            {subtitle}
                          </span>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleCustomerLogout}
                      style={{
                        width: "100%",
                        marginTop: 20,
                        padding: 15,
                        border: "1px solid #f0cbd4",
                        borderRadius: 15,
                        background: "#fff5f7",
                        color: "#b53e5e",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      Sign out
                    </button>

                    <p
                      style={{
                        marginTop: 18,
                        color: "#8a8a95",
                        fontSize: 12,
                        lineHeight: 1.6,
                        textAlign: "center",
                      }}
                    >
                      Business accounts use the separate Admin Portal.
                    </p>
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                        padding: 5,
                        borderRadius: 15,
                        background: "#f5f5f8",
                        marginBottom: 22,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("login");
                          setAuthError("");
                          setAuthMessage("");
                        }}
                        style={{
                          padding: 12,
                          border: 0,
                          borderRadius: 11,
                          background:
                            authMode === "login"
                              ? "#fff"
                              : "transparent",
                          boxShadow:
                            authMode === "login"
                              ? "0 5px 18px rgba(20,20,40,.08)"
                              : "none",
                          color:
                            authMode === "login"
                              ? "#22222b"
                              : "#777783",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        Sign in
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("signup");
                          setAuthError("");
                          setAuthMessage("");
                        }}
                        style={{
                          padding: 12,
                          border: 0,
                          borderRadius: 11,
                          background:
                            authMode === "signup"
                              ? "#fff"
                              : "transparent",
                          boxShadow:
                            authMode === "signup"
                              ? "0 5px 18px rgba(20,20,40,.08)"
                              : "none",
                          color:
                            authMode === "signup"
                              ? "#22222b"
                              : "#777783",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        Sign up
                      </button>
                    </div>

                    {authMessage && (
                      <div
                        style={{
                          marginBottom: 14,
                          padding: "11px 13px",
                          borderRadius: 13,
                          background: "#ecfbf5",
                          color: "#147c59",
                          fontSize: 13,
                          fontWeight: 700,
                          lineHeight: 1.5,
                        }}
                      >
                        {authMessage}
                      </div>
                    )}

                    {authError && (
                      <div
                        style={{
                          marginBottom: 14,
                          padding: "11px 13px",
                          borderRadius: 13,
                          background: "#fff0f3",
                          color: "#a52d4b",
                          fontSize: 13,
                          fontWeight: 700,
                          lineHeight: 1.5,
                        }}
                      >
                        {authError}
                      </div>
                    )}

                    <form
                      onSubmit={
                        authMode === "login"
                          ? handleCustomerLogin
                          : handleCustomerSignup
                      }
                    >
                      {authMode === "signup" && (
                        <label
                          style={{
                            display: "block",
                            marginBottom: 14,
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              marginBottom: 7,
                              color: "#555561",
                              fontSize: 12,
                              fontWeight: 900,
                            }}
                          >
                            FULL NAME
                          </span>

                          <input
                            name="name"
                            value={authForm.name}
                            onChange={updateAuthField}
                            placeholder="Your full name"
                            autoComplete="name"
                            style={{
                              width: "100%",
                              boxSizing: "border-box",
                              padding: "14px 15px",
                              border: "1px solid #e3e3ea",
                              borderRadius: 14,
                              outline: "none",
                              fontSize: 14,
                              background: "#fafafd",
                            }}
                          />
                        </label>
                      )}

                      <label
                        style={{
                          display: "block",
                          marginBottom: 14,
                        }}
                      >
                        <span
                          style={{
                            display: "block",
                            marginBottom: 7,
                            color: "#555561",
                            fontSize: 12,
                            fontWeight: 900,
                          }}
                        >
                          EMAIL
                        </span>

                        <input
                          name="email"
                          type="email"
                          value={authForm.email}
                          onChange={updateAuthField}
                          placeholder="you@example.com"
                          autoComplete="email"
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            padding: "14px 15px",
                            border: "1px solid #e3e3ea",
                            borderRadius: 14,
                            outline: "none",
                            fontSize: 14,
                            background: "#fafafd",
                          }}
                        />
                      </label>

                      <label
                        style={{
                          display: "block",
                          marginBottom: 14,
                        }}
                      >
                        <span
                          style={{
                            display: "block",
                            marginBottom: 7,
                            color: "#555561",
                            fontSize: 12,
                            fontWeight: 900,
                          }}
                        >
                          PASSWORD
                        </span>

                        <input
                          name="password"
                          type="password"
                          value={authForm.password}
                          onChange={updateAuthField}
                          placeholder="Minimum 8 characters"
                          autoComplete={
                            authMode === "login"
                              ? "current-password"
                              : "new-password"
                          }
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            padding: "14px 15px",
                            border: "1px solid #e3e3ea",
                            borderRadius: 14,
                            outline: "none",
                            fontSize: 14,
                            background: "#fafafd",
                          }}
                        />
                      </label>

                      {authMode === "signup" && (
                        <label
                          style={{
                            display: "block",
                            marginBottom: 18,
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              marginBottom: 7,
                              color: "#555561",
                              fontSize: 12,
                              fontWeight: 900,
                            }}
                          >
                            CONFIRM PASSWORD
                          </span>

                          <input
                            name="confirmPassword"
                            type="password"
                            value={authForm.confirmPassword}
                            onChange={updateAuthField}
                            placeholder="Repeat your password"
                            autoComplete="new-password"
                            style={{
                              width: "100%",
                              boxSizing: "border-box",
                              padding: "14px 15px",
                              border: "1px solid #e3e3ea",
                              borderRadius: 14,
                              outline: "none",
                              fontSize: 14,
                              background: "#fafafd",
                            }}
                          />
                        </label>
                      )}

                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={authLoading}
                        style={{
                          width: "100%",
                          minHeight: 52,
                          opacity: authLoading ? 0.7 : 1,
                        }}
                      >
                        {authLoading
                          ? authMode === "login"
                            ? "Signing in..."
                            : "Creating account..."
                          : authMode === "login"
                            ? "Sign in"
                            : "Create account"}
                        {!authLoading && <span>→</span>}
                      </button>
                    </form>

                    <div
                      style={{
                        marginTop: 20,
                        paddingTop: 18,
                        borderTop: "1px solid #eeeeF3",
                        color: "#858590",
                        fontSize: 12,
                        lineHeight: 1.6,
                        textAlign: "center",
                      }}
                    >
                      Customer accounts are separate from seller/admin
                      accounts. Your shopping account only accesses this store.
                    </div>
                  </>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* =====================================================
          CUSTOMER ORDERS
      ===================================================== */}

      <AnimatePresence>
        {activePanel === "orders" && (
          <>
            <motion.div
              style={panelBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePanels}
            />

            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              style={{ ...drawerStyle, width: "min(620px, 94vw)" }}
            >
              <div
                style={{
                  padding: 24,
                  borderBottom: "1px solid #eeeeF3",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <small
                    style={{
                      color: "#7650dc",
                      fontWeight: 900,
                      letterSpacing: ".12em",
                    }}
                  >
                    NOVA ACCOUNT
                  </small>
                  <h2
                    style={{
                      margin: "7px 0 0",
                      fontFamily: "Manrope, sans-serif",
                      letterSpacing: "-.04em",
                    }}
                  >
                    My orders
                  </h2>
                </div>
                <button onClick={closePanels} style={closeButtonStyle}>×</button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
                {ordersLoading ? (
                  <div style={{ padding: 40, textAlign: "center", color: "#777783" }}>
                    Loading your orders…
                  </div>
                ) : ordersError ? (
                  <div
                    style={{
                      padding: 18,
                      borderRadius: 18,
                      background: "#fff5f7",
                      border: "1px solid #f0cbd4",
                      color: "#a33a58",
                      lineHeight: 1.6,
                    }}
                  >
                    {ordersError}
                    <button
                      type="button"
                      onClick={openCustomerOrders}
                      style={{
                        display: "block",
                        marginTop: 12,
                        border: 0,
                        background: "#111118",
                        color: "#fff",
                        borderRadius: 12,
                        padding: "10px 14px",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Try again
                    </button>
                  </div>
                ) : customerOrders.length === 0 ? (
                  <div
                    style={{
                      padding: 42,
                      textAlign: "center",
                      border: "1px dashed #dedee7",
                      borderRadius: 22,
                      background: "#fafafd",
                    }}
                  >
                    <div style={{ fontSize: 38, marginBottom: 12 }}>▣</div>
                    <h3 style={{ margin: 0, fontSize: 20 }}>No orders yet</h3>
                    <p style={{ margin: "8px 0 0", color: "#858590", lineHeight: 1.6 }}>
                      Your purchases will appear here after checkout.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        closePanels();
                        scrollTo("trending");
                      }}
                      style={{
                        marginTop: 18,
                        border: 0,
                        borderRadius: 13,
                        background: "#111118",
                        color: "#fff",
                        padding: "12px 18px",
                        fontWeight: 850,
                        cursor: "pointer",
                      }}
                    >
                      Continue shopping
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 14 }}>
                    {customerOrders.map((order) => {
                      const status = String(order.status || "PENDING").toUpperCase();
                      const paymentStatus = String(order.paymentStatus || "PENDING").toUpperCase();
                      const items = Array.isArray(order.items) ? order.items : [];
                      const canCancel = ["PENDING_PAYMENT", "CONFIRMED", "PROCESSING"].includes(status);
                      const total = Number(order.totalAmount ?? order.total ?? order.subtotal ?? 0);
                      const dateLabel = order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—";

                      return (
                        <article
                          key={order._id}
                          style={{
                            border: "1px solid #e9e9f0",
                            borderRadius: 22,
                            padding: 18,
                            background: "#fff",
                            boxShadow: "0 10px 30px rgba(17,17,24,.045)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              alignItems: "flex-start",
                              flexWrap: "wrap",
                            }}
                          >
                            <div>
                              <small style={{ color: "#888893", fontWeight: 800 }}>ORDER</small>
                              <h3 style={{ margin: "4px 0 0", fontSize: 17 }}>
                                #{order.orderNumber || String(order._id || "").slice(-8).toUpperCase()}
                              </h3>
                              <p style={{ margin: "5px 0 0", color: "#888893", fontSize: 12 }}>
                                Placed {dateLabel}
                              </p>
                            </div>

                            <span
                              style={{
                                padding: "7px 10px",
                                borderRadius: 999,
                                background:
                                  status === "DELIVERED"
                                    ? "#eafaf4"
                                    : status === "CANCELLED"
                                      ? "#fff0f3"
                                      : "#f1edff",
                                color:
                                  status === "DELIVERED"
                                    ? "#087b57"
                                    : status === "CANCELLED"
                                      ? "#b53e5e"
                                      : "#6249c8",
                                fontSize: 10,
                                fontWeight: 900,
                                letterSpacing: ".06em",
                              }}
                            >
                              {status.replace(/_/g, " ")}
                            </span>
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(3, minmax(0,1fr))",
                              gap: 10,
                              marginTop: 16,
                            }}
                          >
                            <div style={{ padding: 12, borderRadius: 15, background: "#f8f8fb" }}>
                              <small style={{ color: "#8b8b96" }}>Total</small>
                              <strong style={{ display: "block", marginTop: 4 }}>₹{total.toLocaleString("en-IN")}</strong>
                            </div>
                            <div style={{ padding: 12, borderRadius: 15, background: "#f8f8fb" }}>
                              <small style={{ color: "#8b8b96" }}>Items</small>
                              <strong style={{ display: "block", marginTop: 4 }}>{items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}</strong>
                            </div>
                            <div style={{ padding: 12, borderRadius: 15, background: "#f8f8fb" }}>
                              <small style={{ color: "#8b8b96" }}>Payment</small>
                              <strong style={{ display: "block", marginTop: 4, fontSize: 12 }}>{paymentStatus.replace(/_/g, " ")}</strong>
                            </div>
                          </div>

                          {items.length > 0 && (
                            <div style={{ marginTop: 15, display: "grid", gap: 8 }}>
                              {items.slice(0, 4).map((item, index) => (
                                <div
                                  key={`${order._id}-${index}`}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: 12,
                                    padding: "10px 0",
                                    borderTop: "1px solid #f0f0f4",
                                    fontSize: 13,
                                  }}
                                >
                                  <span style={{ color: "#555560" }}>
                                    {item.name || item.productName || "Product"} × {item.quantity || 1}
                                  </span>
                                  <strong>₹{Number(item.totalPrice ?? item.unitPrice ?? item.price ?? 0).toLocaleString("en-IN")}</strong>
                                </div>
                              ))}
                              {items.length > 4 && (
                                <span style={{ color: "#888893", fontSize: 12 }}>
                                  +{items.length - 4} more item{items.length - 4 === 1 ? "" : "s"}
                                </span>
                              )}
                            </div>
                          )}

                          {order.shippingAddress && (
                            <div style={{ marginTop: 14, padding: 13, borderRadius: 15, background: "#fafafd", color: "#777783", fontSize: 12, lineHeight: 1.55 }}>
                              <strong style={{ color: "#33333d" }}>Delivery</strong><br />
                              {order.shippingAddress.fullName || customer?.name || "Customer"} · {order.shippingAddress.city || ""}{order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ""}
                            </div>
                          )}

                          {status === "PENDING_PAYMENT" && paymentStatus !== "PAID" && (
                            <button
                              type="button"
                              disabled={retryingOrderId === order._id}
                              onClick={() => handleRetryCustomerOrderPayment(order)}
                              style={{
                                marginTop: 14,
                                marginRight: 8,
                                border: "0",
                                borderRadius: 12,
                                background: "#111118",
                                color: "#fff",
                                padding: "10px 14px",
                                fontWeight: 850,
                                cursor: retryingOrderId === order._id ? "wait" : "pointer",
                                boxShadow: "0 8px 20px rgba(17,17,24,.12)",
                              }}
                            >
                              {retryingOrderId === order._id ? "Opening payment…" : "Retry payment →"}
                            </button>
                          )}

                          {canCancel && (
                            <button
                              type="button"
                              disabled={cancellingOrderId === order._id || retryingOrderId === order._id}
                              onClick={() => handleCancelCustomerOrder(order._id)}
                              style={{
                                marginTop: 14,
                                border: "1px solid #f0cbd4",
                                borderRadius: 12,
                                background: "#fff5f7",
                                color: "#b53e5e",
                                padding: "10px 13px",
                                fontWeight: 800,
                                cursor: cancellingOrderId === order._id ? "wait" : "pointer",
                              }}
                            >
                              {cancellingOrderId === order._id ? "Cancelling…" : "Cancel order"}
                            </button>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* =====================================================
          CUSTOMER SUPPORT
      ===================================================== */}

      <AnimatePresence>
        {activePanel === "support" && (
          <>
            <motion.div
              style={panelBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePanels}
            />

            <motion.aside
              style={{
                ...drawerStyle,
                width: "min(560px, 96vw)",
              }}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                style={{
                  padding: 24,
                  borderBottom: "1px solid #eeeef3",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div>
                  <small
                    style={{
                      color: "#6c5ce7",
                      fontWeight: 900,
                      letterSpacing: ".14em",
                    }}
                  >
                    NOVA SUPPORT
                  </small>
                  <h2
                    style={{
                      margin: "7px 0 0",
                      letterSpacing: "-.04em",
                    }}
                  >
                    How can we help?
                  </h2>
                  <p
                    style={{
                      margin: "7px 0 0",
                      color: "#858590",
                      lineHeight: 1.5,
                    }}
                  >
                    Describe your problem and our store team can reply to you here.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closePanels}
                  style={closeButtonStyle}
                >
                  ×
                </button>
              </div>

              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: 24,
                }}
              >
                {supportError && (
                  <div
                    style={{
                      padding: 13,
                      borderRadius: 15,
                      background: "#fff1f2",
                      border: "1px solid #fecdd3",
                      color: "#be123c",
                      fontSize: 13,
                      lineHeight: 1.5,
                      marginBottom: 14,
                    }}
                  >
                    {supportError}
                  </div>
                )}

                {supportNotice && (
                  <div
                    style={{
                      padding: 13,
                      borderRadius: 15,
                      background: "#ecfdf5",
                      border: "1px solid #bbf7d0",
                      color: "#166534",
                      fontSize: 13,
                      lineHeight: 1.5,
                      marginBottom: 14,
                    }}
                  >
                    ✓ {supportNotice}
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    marginBottom: 18,
                  }}
                >
                  {supportLoading ? (
                    <div
                      style={{
                        padding: 20,
                        borderRadius: 18,
                        background: "#f8f8fb",
                        color: "#777783",
                        textAlign: "center",
                      }}
                    >
                      Loading conversation…
                    </div>
                  ) : supportReplies.length === 0 ? (
                    <div
                      style={{
                        padding: 24,
                        borderRadius: 18,
                        border: "1px dashed #dddde8",
                        background: "#fafafd",
                        color: "#777783",
                        fontSize: 13,
                        lineHeight: 1.6,
                      }}
                    >
                      No messages yet. Send your first message below and it will appear here.
                    </div>
                  ) : (
                    supportReplies.map((notification) => {
                      const fromSupport =
                        notification?.event ===
                        "CUSTOMER_SUPPORT_REPLY";

                      return (
                        <div
                          key={notification._id}
                          style={{
                            display: "flex",
                            justifyContent: fromSupport ? "flex-start" : "flex-end",
                          }}
                        >
                          <div
                            style={{
                              maxWidth: "86%",
                              padding: "12px 14px",
                              borderRadius: fromSupport
                                ? "16px 16px 16px 5px"
                                : "16px 16px 5px 16px",
                              background: fromSupport
                                ? "#f4f1ff"
                                : "linear-gradient(135deg,#111936,#4032a8)",
                              color: fromSupport ? "#28243b" : "#fff",
                              boxShadow: "0 8px 24px rgba(17,17,24,.06)",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 900,
                                letterSpacing: ".08em",
                                opacity: 0.72,
                                marginBottom: 5,
                              }}
                            >
                              {fromSupport ? "STORE SUPPORT" : "YOU"}
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                lineHeight: 1.55,
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {notification.message}
                            </div>
                            <div
                              style={{
                                marginTop: 7,
                                fontSize: 10,
                                opacity: 0.62,
                              }}
                            >
                              {formatDate(notification.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form
                  onSubmit={handleSupportSubmit}
                  style={{
                    padding: 16,
                    borderRadius: 20,
                    background: "linear-gradient(135deg,#f5f2ff,#effbff)",
                    border: "1px solid #e8e3f7",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: 14,
                      marginBottom: 10,
                    }}
                  >
                    Send a message
                  </div>

                  <textarea
                    value={supportMessage}
                    onChange={(event) => {
                      setSupportMessage(event.target.value);
                      setSupportError("");
                      setSupportNotice("");
                    }}
                    rows={6}
                    maxLength={1000}
                    placeholder="Tell us what went wrong, what you expected, and any useful order details…"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      resize: "vertical",
                      minHeight: 132,
                      padding: 14,
                      border: "1px solid #dedbea",
                      borderRadius: 15,
                      outline: "none",
                      background: "rgba(255,255,255,.88)",
                      fontSize: 14,
                      lineHeight: 1.55,
                    }}
                  />

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      marginTop: 10,
                    }}
                  >
                    <span
                      style={{
                        color: "#8b8b96",
                        fontSize: 11,
                      }}
                    >
                      {supportMessage.length}/1000
                    </span>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={supportSending || supportMessage.trim().length < 2}
                      style={{ minWidth: 155, height: 46 }}
                    >
                      {supportSending
                        ? "Sending…"
                        : "Send to support →"}
                    </button>
                  </div>
                </form>

                <button
                  type="button"
                  onClick={loadSupportConversation}
                  disabled={supportLoading}
                  style={{
                    width: "100%",
                    marginTop: 10,
                    padding: 12,
                    border: "1px solid #e1e0ea",
                    borderRadius: 14,
                    background: "#fff",
                    color: "#555560",
                    fontWeight: 800,
                    cursor: supportLoading ? "wait" : "pointer",
                  }}
                >
                  Refresh replies
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* =====================================================
          SEARCH OVERLAY
      ===================================================== */}

      <AnimatePresence>
        {activePanel === "search" && (
          <>
            <motion.div
              style={panelBackdrop}
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              onClick={closePanels}
            />

            <motion.div
              initial={{
                opacity: 0,
                y: -25,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -25,
              }}
              transition={{
                duration: 0.22,
              }}
              style={{
                position: "fixed",
                top: 90,
                left: "50%",
                transform:
                  "translateX(-50%)",
                width:
                  "min(760px, calc(100% - 28px))",
                zIndex: 301,
                padding: 24,
                borderRadius: 28,
                background: "#fff",
                boxShadow:
                  "0 30px 90px rgba(17,17,24,.2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 24,
                    color: "#777",
                  }}
                >
                  ⌕
                </span>

                <input
                  autoFocus
                  value={search}
                  onChange={(event) => {
                    setPage(1);
                    setSearch(event.target.value);
                  }}
                  placeholder="Search products, brands, categories..."
                  style={{
                    flex: 1,
                    border: 0,
                    outline: 0,
                    fontSize: 17,
                    fontWeight: 600,
                    color: "#17171d",
                  }}
                />

                <button
                  onClick={closePanels}
                  style={closeButtonStyle}
                >
                  ×
                </button>
              </div>

              {search.trim() && (
                <div
                  style={{
                    marginTop: 18,
                    display: "grid",
                    gap: 10,
                    maxHeight: 300,
                    overflowY: "auto",
                  }}
                >
                  {filteredProducts.length > 0 ? (
                    filteredProducts
                      .slice(0, 5)
                      .map((product) => (
                        <button
                          key={product._id}
                          onClick={() => {
                            closePanels();
                            scrollTo("trending");
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            width: "100%",
                            padding: 12,
                            border: 0,
                            borderRadius: 16,
                            background: "#f7f7fa",
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                        >
                          <span
                            style={{
                              width: 46,
                              height: 46,
                              flexShrink: 0,
                              display: "grid",
                              placeItems: "center",
                              borderRadius: 13,
                              background:
                                "linear-gradient(145deg,#ded7ff,#b9e9ff)",
                              fontWeight: 900,
                            }}
                          >
                            ✦
                          </span>

                          <span style={{ flex: 1 }}>
                            <strong
                              style={{
                                display: "block",
                                color: "#17171d",
                              }}
                            >
                              {product.name}
                            </strong>

                            <small
                              style={{
                                color: "#777783",
                              }}
                            >
                              {product.categoryId
                                ?.name ||
                                "Product"}{" "}
                              · ₹
                              {Number(
                                product.price || 0
                              ).toLocaleString(
                                "en-IN"
                              )}
                            </small>
                          </span>

                          <span>↗</span>
                        </button>
                      ))
                  ) : (
                    <div
                      style={{
                        padding: 18,
                        borderRadius: 16,
                        background: "#f7f7fa",
                        color: "#777783",
                      }}
                    >
                      No matching products found.
                    </div>
                  )}
                </div>
              )}

              <div
                style={{
                  marginTop: 22,
                  paddingTop: 20,
                  borderTop:
                    "1px solid #eeeeF3",
                }}
              >
                <small
                  style={{
                    color: "#8b8b96",
                    fontWeight: 800,
                    letterSpacing:
                      ".12em",
                  }}
                >
                  {search
                    ? "SEARCHING FOR"
                    : "POPULAR SEARCHES"}
                </small>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 9,
                    marginTop: 13,
                  }}
                >
                  {(search
                    ? [
                        search,
                        `${search} collection`,
                        `${search} trending`,
                      ]
                    : [
                        "New arrivals",
                        "Sneakers",
                        "Electronics",
                        "Fashion",
                        "Best sellers",
                      ]
                  ).map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        setPage(1);
                        setSearch(item);
                      }}
                      style={{
                        padding:
                          "10px 14px",
                        border: 0,
                        borderRadius: 999,
                        background:
                          "#f3f3f7",
                        color: "#44444d",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* =====================================================
          WISHLIST DRAWER
      ===================================================== */}

      <AnimatePresence>
        {activePanel === "wishlist" && (
          <>
            <motion.div
              style={panelBackdrop}
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              onClick={closePanels}
            />

            <motion.aside
              style={drawerStyle}
              initial={{
                x: "100%",
              }}
              animate={{
                x: 0,
              }}
              exit={{
                x: "100%",
              }}
              transition={{
                duration: 0.25,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <div
                style={{
                  padding: 24,
                  borderBottom:
                    "1px solid #eeeeF3",
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <small
                    style={{
                      color: "#7650dc",
                      fontWeight: 800,
                      letterSpacing:
                        ".12em",
                    }}
                  >
                    SAVED FOR LATER
                  </small>

                  <h2
                    style={{
                      margin:
                        "7px 0 0",
                      fontFamily:
                        "Manrope, sans-serif",
                      letterSpacing:
                        "-.04em",
                    }}
                  >
                    Wishlist
                  </h2>
                </div>

                <button
                  onClick={closePanels}
                  style={closeButtonStyle}
                >
                  ×
                </button>
              </div>

              <div
                style={{
                  flex: 1,
                  padding: 24,
                  overflowY: "auto",
                }}
              >
                {wishlist.length === 0 ? (
                  <div
                    style={{
                      minHeight: 400,
                      display: "grid",
                      placeItems:
                        "center",
                      textAlign: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 52,
                          color: "#e05279",
                        }}
                      >
                        ♡
                      </div>

                      <h3>
                        Your wishlist is empty
                      </h3>

                      <p
                        style={{
                          color:
                            "#858590",
                          lineHeight: 1.6,
                        }}
                      >
                        Save products you love
                        and find them here later.
                      </p>

                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          closePanels();
                          scrollTo(
                            "collections"
                          );
                        }}
                        style={{
                          padding:
                            "13px 18px",
                          marginTop: 10,
                        }}
                      >
                        Explore products
                      </button>
                    </div>
                  </div>
                ) : (
                  wishlist.map((productKey) => {
                    const product =
                      products.find(
                        (item) =>
                          item._id ===
                          productKey
                      );

                    if (!product) {
                      return null;
                    }

                    return (
                    <div
                      key={productKey}
                      style={{
                        display: "flex",
                        alignItems:
                          "center",
                        gap: 14,
                        padding:
                          "14px 0",
                        borderBottom:
                          "1px solid #eeeeF3",
                      }}
                    >
                      <div
                        style={{
                          width: 72,
                          height: 82,
                          borderRadius: 16,
                          background:
                            "linear-gradient(145deg,#c2b5ff,#5945aa)",
                        }}
                      />

                      <div
                        style={{
                          flex: 1,
                        }}
                      >
                        <small
                          style={{
                            color:
                              "#8b8b96",
                            fontWeight: 800,
                          }}
                        >
                          NOVA ESSENTIAL
                        </small>

                        <strong
                          style={{
                            display:
                              "block",
                            marginTop: 5,
                          }}
                        >
                          {product.name}
                        </strong>

                        <span>
                          ₹
                          {Number(
                            product.price || 0
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </span>
                      </div>

                      <button
                        onClick={() =>
                          toggleWishlist(product)
                        }
                        style={{
                          border: 0,
                          background:
                            "transparent",
                          color:
                            "#e05279",
                          fontSize: 21,
                          cursor:
                            "pointer",
                        }}
                      >
                        ♥
                      </button>
                    </div>
                    );
                  })
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* =====================================================
          BAG DRAWER
      ===================================================== */}

      <AnimatePresence>
        {activePanel === "cart" && (
          <>
            <motion.div
              className="cart-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePanels}
            />

            <motion.aside
              className="cart-drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <header className="cart-drawer-header">
                <div>
                  <span className="cart-drawer-kicker">YOUR SHOPPING BAG</span>
                  <h2>
                    Bag <span>({cartCount})</span>
                  </h2>
                </div>
                <button
                  className="cart-drawer-close"
                  onClick={closePanels}
                  aria-label="Close shopping bag"
                >
                  ×
                </button>
              </header>

              <div className={`cart-sync-note ${customerAuthenticated ? "is-synced" : ""}`}>
                <span className="cart-sync-dot">✓</span>
                {customerAuthenticated ? (
                  "Your bag is synced with your account."
                ) : (
                  <>
                    Guest bag is saved on this device. {" "}
                    <button type="button" onClick={() => openAuthPanel("login")}>
                      Sign in to sync
                    </button>
                  </>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="cart-empty-state">
                  <div className="cart-empty-icon">🛍</div>
                  <span className="cart-empty-eyebrow">NOTHING HERE YET</span>
                  <h3>Your bag is empty</h3>
                  <p>
                    Discover something you love and it will appear here.
                  </p>
                  <button
                    className="btn btn-primary cart-empty-button"
                    onClick={() => {
                      closePanels();
                      scrollTo("collections");
                    }}
                  >
                    Start shopping <span>↗</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="cart-items">
                    {cart.map((item) => {
                      const itemId = item.cartItemId || item.productId || item.name;
                      const comparePrice = Number(item.compareAtPrice || 0);
                      const itemSavings = Math.max(comparePrice - Number(item.price || 0), 0);
                      const itemImage = item.imageUrl || "";

                      return (
                        <article className="cart-item" key={itemId}>
                          <div className="cart-item-media">
                            {itemImage ? (
                              <img
                                src={itemImage}
                                alt={item.name}
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                  event.currentTarget.nextElementSibling.style.display = "grid";
                                }}
                              />
                            ) : null}
                            <div className="cart-item-placeholder" style={{ display: itemImage ? "none" : "grid" }}>
                              <span>✦</span>
                            </div>
                          </div>

                          <div className="cart-item-content">
                            <div className="cart-item-heading">
                              <div>
                                <span className="cart-item-category">{item.category}</span>
                                <h3>{item.name}</h3>
                              </div>
                              <strong>₹{(Number(item.price || 0) * Number(item.quantity || 0)).toLocaleString("en-IN")}</strong>
                            </div>

                            <div className="cart-item-meta">
                              <span>₹{Number(item.price || 0).toLocaleString("en-IN")} each</span>
                              {itemSavings > 0 && (
                                <span className="cart-item-savings">Save ₹{(itemSavings * Number(item.quantity || 0)).toLocaleString("en-IN")}</span>
                              )}
                            </div>

                            <div className="cart-item-actions">
                              <div className="cart-quantity">
                                <button
                                  onClick={() => updateCartQuantity(item, -1)}
                                  aria-label={`Decrease ${item.name} quantity`}
                                >
                                  −
                                </button>
                                <strong>{item.quantity}</strong>
                                <button
                                  onClick={() => updateCartQuantity(item, 1)}
                                  aria-label={`Increase ${item.name} quantity`}
                                >
                                  +
                                </button>
                              </div>
                              <button
                                className="cart-remove"
                                onClick={() => updateCartQuantity(item, -Number(item.quantity || 1))}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <footer className="cart-summary">
                    <div className="cart-summary-top">
                      <div>
                        <span>Subtotal</span>
                        <small>Shipping and taxes calculated at checkout</small>
                      </div>
                      <strong>₹{cartTotal.toLocaleString("en-IN")}</strong>
                    </div>

                    <div className="cart-trust-row">
                      <span>✓ Secure checkout</span>
                      <span>✓ Easy returns</span>
                    </div>

                    <button
                      className="btn btn-primary cart-checkout-button"
                      onClick={handleCheckout}
                    >
                      Proceed to checkout <span>→</span>
                    </button>

                    <button className="cart-clear-button" onClick={clearCart}>
                      Clear bag
                    </button>
                  </footer>
                </>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>


      {/* =====================================================
          CHECKOUT PANEL
      ===================================================== */}

      <AnimatePresence>
        {activePanel === "checkout" && (
          <>
            <motion.div
              style={panelBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePanels}
            />

            <motion.aside
              style={{
                ...drawerStyle,
                width: "min(620px, 96vw)",
              }}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                style={{
                  padding: 24,
                  borderBottom: "1px solid #eeeeF3",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <small
                    style={{
                      color: "#7650dc",
                      fontWeight: 800,
                      letterSpacing: ".12em",
                    }}
                  >
                    SECURE CHECKOUT
                  </small>
                  <h2
                    style={{
                      margin: "7px 0 0",
                      fontFamily: "Manrope, sans-serif",
                      letterSpacing: "-.04em",
                    }}
                  >
                    {placedOrder ? "Order confirmed" : "Shipping details"}
                  </h2>
                </div>

                <button onClick={closePanels} style={closeButtonStyle}>
                  ×
                </button>
              </div>

              {placedOrder ? (
                <div
                  style={{
                    flex: 1,
                    padding: 32,
                    overflowY: "auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div style={{ width: "100%", maxWidth: 460, textAlign: "center" }}>
                    <div
                      style={{
                        width: 86,
                        height: 86,
                        margin: "0 auto 20px",
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        background: "linear-gradient(135deg,#e9fff6,#eee9ff)",
                        fontSize: 38,
                      }}
                    >
                      ✓
                    </div>

                    <h3 style={{ fontSize: 28, margin: "0 0 10px" }}>
                      Thanks for your order!
                    </h3>

                    <p style={{ color: "#777783", lineHeight: 1.6 }}>
                      Your order has been created and inventory has been reserved.
                      Complete the payment step to continue the order lifecycle.
                    </p>

                    <div
                      style={{
                        marginTop: 24,
                        padding: 20,
                        borderRadius: 20,
                        background: "#f7f7fa",
                        textAlign: "left",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                        <span style={{ color: "#858590" }}>Order ID</span>
                        <strong style={{ wordBreak: "break-all" }}>{placedOrder?._id}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                        <span style={{ color: "#858590" }}>Order status</span>
                        <strong>{placedOrder?.status || "PENDING_PAYMENT"}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                        <span style={{ color: "#858590" }}>Total</span>
                        <strong>₹{Number(placedOrder?.total ?? placedOrder?.subtotal ?? 0).toLocaleString("en-IN")}</strong>
                      </div>
                      {payment && (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                            <span style={{ color: "#858590" }}>Payment status</span>
                            <strong>{payment?.status || "PENDING"}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, gap: 16 }}>
                            <span style={{ color: "#858590" }}>Payment ID</span>
                            <strong style={{ wordBreak: "break-all", textAlign: "right" }}>
                              {payment?.razorpayPaymentId ||
                                payment?._id ||
                                payment?.id ||
                                "Created"}
                            </strong>
                          </div>
                        </>
                      )}
                    </div>

                    {paymentSuccess && (
                      <div
                        style={{
                          marginTop: 16,
                          padding: 14,
                          borderRadius: 14,
                          background: "#ecfdf5",
                          color: "#166534",
                          fontSize: 14,
                          lineHeight: 1.5,
                          fontWeight: 700,
                        }}
                      >
                        ✓ Payment completed successfully. Order status: CONFIRMED
                      </div>
                    )}

                    {paymentError && (
                      <div
                        style={{
                          marginTop: 16,
                          padding: 14,
                          borderRadius: 14,
                          background: "#fff1f2",
                          color: "#be123c",
                          fontSize: 14,
                          lineHeight: 1.5,
                        }}
                      >
                        {paymentError}
                      </div>
                    )}

                    {!payment ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={initiatePayment}
                        disabled={paymentLoading}
                        style={{ width: "100%", marginTop: 20, height: 52 }}
                      >
                        {paymentLoading ? "Initializing payment..." : "Proceed to payment"}
                        {!paymentLoading && <span>→</span>}
                      </button>
                    ) : (
                      <div
                        style={{
                          marginTop: 20,
                          padding: 16,
                          borderRadius: 16,
                          background: "linear-gradient(135deg,#ecfdf5,#eef2ff)",
                          color: "#166534",
                          fontSize: 14,
                          lineHeight: 1.5,
                        }}
                      >
                        {paymentSuccess
                          ? "Payment completed successfully. Your order is confirmed."
                          : paymentProcessing
                          ? "Processing your payment securely..."
                          : "Payment session initialized. Razorpay Checkout is ready."}
                      </div>
                    )}

                    <button
                      className="btn btn-secondary"
                      onClick={closePanels}
                      style={{ width: "100%", marginTop: 12, height: 50 }}
                    >
                      Continue shopping
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={submitCheckout}
                  style={{ flex: 1, padding: 24, overflowY: "auto" }}
                >
                  <div
                    style={{
                      padding: 18,
                      borderRadius: 20,
                      background: "linear-gradient(135deg,#f7f3ff,#f0fbff)",
                      marginBottom: 22,
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>Order summary</div>
                    <div style={{ color: "#777783", marginTop: 6 }}>
                      {cartCount} item{cartCount === 1 ? "" : "s"} · ₹{cartTotal.toLocaleString("en-IN")}
                    </div>
                  </div>

                  {checkoutError && (
                    <div
                      style={{
                        padding: "12px 14px",
                        borderRadius: 14,
                        background: "#fff0f3",
                        color: "#a52d4b",
                        fontWeight: 700,
                        fontSize: 13,
                        marginBottom: 18,
                      }}
                    >
                      {checkoutError}
                    </div>
                  )}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 14,
                    }}
                  >
                    {[
                      ["fullName", "Full name", "text"],
                      ["phone", "Phone number", "tel"],
                      ["addressLine1", "Address", "text"],
                      ["city", "City", "text"],
                      ["state", "State", "text"],
                      ["postalCode", "Postal code", "text"],
                      ["country", "Country", "text"],
                    ].map(([name, label, type]) => (
                      <label
                        key={name}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 7,
                          gridColumn: name === "addressLine1" ? "1 / -1" : undefined,
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#5f5f6b" }}>
                          {label}
                        </span>
                        <input
                          name={name}
                          type={type}
                          value={shippingAddress[name]}
                          onChange={updateShippingField}
                          placeholder={label}
                          autoComplete="shipping"
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            border: "1px solid #e2e2e9",
                            borderRadius: 14,
                            padding: "13px 14px",
                            outline: "none",
                            fontSize: 14,
                            background: "#fff",
                          }}
                        />
                      </label>
                    ))}
                  </div>

                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={checkoutLoading}
                    style={{
                      width: "100%",
                      height: 54,
                      marginTop: 22,
                      opacity: checkoutLoading ? 0.7 : 1,
                    }}
                  >
                    {checkoutLoading ? "Placing order..." : "Place order"}
                    <span>{checkoutLoading ? "…" : "→"}</span>
                  </button>

                  <p
                    style={{
                      textAlign: "center",
                      color: "#8b8b96",
                      fontSize: 12,
                      lineHeight: 1.5,
                      marginTop: 12,
                    }}
                  >
                    Payment will be handled in the next checkout step.
                  </p>
                </form>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}

export default App;