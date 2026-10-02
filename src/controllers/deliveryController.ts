import { Request, Response } from 'express';
import { DeliveryOrder } from '../models/DeliveryOrder';
import { StoreOrder } from '../models/StoreOrder';

export const getDeliveries = async (req: Request, res: Response) => {
  try {
    const { status, class_id, search, limit = '100', page = '1' } = req.query;
    const filter: any = {};

    if (status && status !== 'all') {
      filter.status = status;
    }
    if (class_id && class_id !== 'all') {
      filter.class_id = class_id;
    }
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { order_id: { $regex: q, $options: 'i' } },
        { tracking_number: { $regex: q, $options: 'i' } },
        { recipient_name: { $regex: q, $options: 'i' } },
        { recipient_phone: { $regex: q, $options: 'i' } },
        { shipping_address: { $regex: q, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [deliveries, total] = await Promise.all([
      DeliveryOrder.find(filter)
        .populate('student_id', 'first_name last_name email phone')
        .populate('class_id', 'title class_id grade subject')
        .populate('store_order_id')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum),
      DeliveryOrder.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: deliveries.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: deliveries,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyDeliveries = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const deliveries = await DeliveryOrder.find({ student_id: userId })
      .populate('class_id', 'title class_id grade subject')
      .populate('store_order_id')
      .sort({ created_at: -1 });

    res.json({ success: true, count: deliveries.length, data: deliveries });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateDeliveryStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, tracking_number, courier_service } = req.body;

    const delivery = await DeliveryOrder.findById(id);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery order not found' });
    }

    if (status) {
      delivery.status = status;
      if (status === 'dispatched' || status === 'shipped') {
        if (!delivery.dispatched_at) delivery.dispatched_at = new Date();
      } else if (status === 'delivered') {
        if (!delivery.delivered_at) delivery.delivered_at = new Date();
      }
    }

    if (tracking_number !== undefined) {
      delivery.tracking_number = tracking_number;
    }
    if (courier_service !== undefined) {
      delivery.courier_service = courier_service;
    }

    await delivery.save();

    // If associated with a StoreOrder, sync fulfillment status
    if (delivery.store_order_id) {
      let storeFulfillment = 'unfulfilled';
      if (delivery.status === 'delivered') {
        storeFulfillment = 'delivered';
      } else if (delivery.status === 'dispatched' || delivery.status === 'shipped') {
        storeFulfillment = 'shipped';
      } else if (delivery.status === 'processing') {
        storeFulfillment = 'processing';
      } else if (delivery.status === 'cancelled') {
        storeFulfillment = 'cancelled';
      }

      await StoreOrder.findByIdAndUpdate(delivery.store_order_id, {
        fulfillment_status: storeFulfillment,
      });
    }

    res.json({ success: true, message: 'Delivery status updated', data: delivery });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateTracking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tracking_number, courier_service, mark_dispatched } = req.body;

    if (!tracking_number) {
      return res.status(400).json({ success: false, message: 'Tracking number is required' });
    }

    const delivery = await DeliveryOrder.findById(id);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery order not found' });
    }

    delivery.tracking_number = tracking_number;
    if (courier_service) {
      delivery.courier_service = courier_service;
    }

    if (mark_dispatched || delivery.status === 'pending_processing' || delivery.status === 'processing') {
      delivery.status = 'dispatched';
      delivery.dispatched_at = new Date();
    }

    await delivery.save();

    if (delivery.store_order_id) {
      await StoreOrder.findByIdAndUpdate(delivery.store_order_id, {
        fulfillment_status: 'shipped',
      });
    }

    res.json({ success: true, message: 'Tracking details updated', data: delivery });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};
