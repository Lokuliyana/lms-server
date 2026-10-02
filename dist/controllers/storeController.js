"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllStoreOrders = exports.getMyStoreOrders = exports.createStoreCheckout = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getProducts = void 0;
const Product_1 = require("../models/Product");
const StoreOrder_1 = require("../models/StoreOrder");
const Transaction_1 = require("../models/Transaction");
const DeliveryOrder_1 = require("../models/DeliveryOrder");
const paymentFactory_1 = require("../services/payments/paymentFactory");
const getProducts = async (req, res) => {
    try {
        const { category, search, include_inactive } = req.query;
        const filter = {};
        if (!include_inactive || include_inactive === 'false') {
            filter.is_active = { $ne: false };
        }
        if (category && category !== 'all') {
            filter.category = category;
        }
        if (search && typeof search === 'string' && search.trim()) {
            filter.$or = [
                { title: { $regex: search.trim(), $options: 'i' } },
                { description: { $regex: search.trim(), $options: 'i' } },
            ];
        }
        const products = await Product_1.Product.find(filter).sort({ created_at: -1 });
        res.json({ success: true, count: products.length, data: products });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getProducts = getProducts;
const getProductById = async (req, res) => {
    try {
        const product = await Product_1.Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({ success: true, data: product });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getProductById = getProductById;
const createProduct = async (req, res) => {
    try {
        const { title, description, price, category, inventory_count, thumbnail_url, is_active } = req.body;
        if (!title || price === undefined) {
            return res.status(400).json({ success: false, message: 'Title and price are required' });
        }
        const product = await Product_1.Product.create({
            title,
            description,
            price: Number(price),
            category: category || 'study_pack',
            inventory_count: Number(inventory_count) || 0,
            thumbnail_url: thumbnail_url || '',
            is_active: is_active !== false,
        });
        res.status(201).json({ success: true, message: 'Product created successfully', data: product });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
exports.createProduct = createProduct;
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const product = await Product_1.Product.findByIdAndUpdate(id, updateData, { new: true });
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({ success: true, message: 'Product updated successfully', data: product });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product_1.Product.findByIdAndUpdate(id, { is_active: false }, { new: true });
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({ success: true, message: 'Product archived successfully', data: product });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.deleteProduct = deleteProduct;
const createStoreCheckout = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }
        const { items, shipping_address, contact_phone, payment_method } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart items cannot be empty' });
        }
        if (!shipping_address) {
            return res.status(400).json({ success: false, message: 'Shipping address is required' });
        }
        // Resolve products and calculate total
        let totalAmount = 0;
        const resolvedItems = [];
        for (const item of items) {
            const prod = await Product_1.Product.findById(item.product_id);
            if (!prod || !prod.is_active) {
                return res.status(400).json({ success: false, message: `Product ${item.product_id} is unavailable` });
            }
            if (prod.inventory_count < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient inventory for ${prod.title} (Available: ${prod.inventory_count})`,
                });
            }
            const itemPrice = Number(prod.price);
            totalAmount += itemPrice * Number(item.quantity);
            resolvedItems.push({
                product_id: prod._id,
                title: prod.title,
                price: itemPrice,
                quantity: Number(item.quantity),
            });
        }
        const orderId = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const storeOrder = await StoreOrder_1.StoreOrder.create({
            order_id: orderId,
            user_id: userId,
            items: resolvedItems,
            total_amount: totalAmount,
            shipping_address,
            contact_phone: contact_phone || req.user?.phone || '',
            payment_status: 'pending',
            fulfillment_status: 'unfulfilled',
        });
        const gateway = process.env.ACTIVE_PAYMENT_GATEWAY || 'stripe';
        const txn = await Transaction_1.Transaction.create({
            user_id: userId,
            order_id: orderId,
            amount: totalAmount,
            currency: 'LKR',
            gateway,
            status: 'pending',
            metadata: {
                order_type: 'store_purchase',
                store_order_id: storeOrder._id.toString(),
            },
        });
        if (txn) {
            storeOrder.transaction_id = txn._id;
            await storeOrder.save();
        }
        // Check if running test/mock or direct fulfillment
        if (payment_method === 'mock' || gateway === 'manual') {
            storeOrder.payment_status = 'paid';
            storeOrder.fulfillment_status = 'processing';
            // Decrement inventory
            for (const item of resolvedItems) {
                await Product_1.Product.findByIdAndUpdate(item.product_id, {
                    $inc: { inventory_count: -item.quantity },
                });
            }
            // Spawn DeliveryOrder
            const deliveryOrder = await DeliveryOrder_1.DeliveryOrder.create({
                order_id: `DEL-${orderId}`,
                student_id: userId,
                store_order_id: storeOrder._id,
                delivery_method: 'Courier Delivery',
                shipping_address,
                recipient_phone: contact_phone || req.user?.phone || '',
                recipient_name: req.user?.full_name || '',
                status: 'pending_processing',
                items: resolvedItems,
            });
            storeOrder.delivery_order_id = deliveryOrder._id;
            await storeOrder.save();
            if (txn) {
                txn.status = 'success';
                await txn.save();
            }
            return res.status(200).json({
                success: true,
                message: 'Order placed successfully',
                order: storeOrder,
                delivery: deliveryOrder,
            });
        }
        // Process through provider checkout
        const provider = (0, paymentFactory_1.getPaymentProvider)();
        const { redirectUrl } = await provider.createCheckout({
            orderId,
            userId: userId.toString(),
            amount: totalAmount,
            currency: 'LKR',
            orderType: 'store_purchase',
        });
        res.status(200).json({
            success: true,
            url: redirectUrl,
            orderId,
            order: storeOrder,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.createStoreCheckout = createStoreCheckout;
const getMyStoreOrders = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.userId;
        const orders = await StoreOrder_1.StoreOrder.find({ user_id: userId })
            .populate('delivery_order_id')
            .sort({ created_at: -1 });
        res.json({ success: true, count: orders.length, data: orders });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getMyStoreOrders = getMyStoreOrders;
const getAllStoreOrders = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = {};
        if (status && status !== 'all') {
            filter.fulfillment_status = status;
        }
        const orders = await StoreOrder_1.StoreOrder.find(filter)
            .populate('user_id', 'first_name last_name email phone')
            .populate('delivery_order_id')
            .sort({ created_at: -1 });
        res.json({ success: true, count: orders.length, data: orders });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getAllStoreOrders = getAllStoreOrders;
