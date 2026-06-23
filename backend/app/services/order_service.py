from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional
from uuid import UUID
from fastapi import HTTPException, status
from decimal import Decimal
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.customer import Customer
from app.schemas.order import OrderCreate, OrderStatusUpdate
import math


class OrderService:
    def create(self, db: Session, payload: OrderCreate) -> Order:
        # Validate customer
        customer = db.query(Customer).filter(Customer.id == payload.customer_id, Customer.is_deleted == False).first()
        if not customer:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"success": False, "message": "Customer not found"})

        # Validate products and stock in a single pass
        product_map = {}
        for item in payload.items:
            if item.product_id in product_map:
                continue
            product = db.query(Product).filter(Product.id == item.product_id, Product.is_deleted == False).with_for_update().first()
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={"success": False, "message": f"Product {item.product_id} not found"},
                )
            product_map[item.product_id] = product

        # Check inventory for all items (aggregate duplicate product_ids)
        quantity_needed: dict[UUID, int] = {}
        for item in payload.items:
            quantity_needed[item.product_id] = quantity_needed.get(item.product_id, 0) + item.quantity

        for product_id, qty in quantity_needed.items():
            product = product_map[product_id]
            if product.quantity_in_stock < qty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"success": False, "message": f"Insufficient stock for '{product.name}'. Available: {product.quantity_in_stock}, Requested: {qty}"},
                )

        # Create order
        order = Order(customer_id=payload.customer_id, status=OrderStatus.PENDING, total_amount=Decimal("0"))
        db.add(order)
        db.flush()

        total = Decimal("0")
        for item in payload.items:
            product = product_map[item.product_id]
            subtotal = Decimal(str(product.price)) * item.quantity
            total += subtotal
            order_item = OrderItem(
                order_id=order.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=product.price,
                subtotal=subtotal,
            )
            db.add(order_item)
            product.quantity_in_stock -= quantity_needed.get(item.product_id, 0)
            quantity_needed[item.product_id] = 0  # avoid double deduction for duplicate entries

        order.total_amount = total
        db.commit()
        db.refresh(order)
        return self._load_full_order(db, order.id)

    def get_all(self, db: Session, page: int = 1, size: int = 20, status_filter: Optional[str] = None) -> dict:
        query = db.query(Order).options(joinedload(Order.customer), joinedload(Order.items))
        if status_filter:
            query = query.filter(Order.status == status_filter)
        total = query.count()
        orders = query.order_by(Order.created_at.desc()).offset((page - 1) * size).limit(size).all()
        for order in orders:
            order.item_count = len(order.items)
        return {"items": orders, "total": total, "page": page, "size": size, "pages": math.ceil(total / size) if total else 0}

    def get_by_id(self, db: Session, order_id: UUID) -> Order:
        return self._load_full_order(db, order_id)

    def update_status(self, db: Session, order_id: UUID, payload: OrderStatusUpdate) -> Order:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"success": False, "message": "Order not found"})
        if order.status == OrderStatus.CANCELLED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"success": False, "message": "Cannot update a cancelled order"})
        order.status = payload.status
        db.commit()
        db.refresh(order)
        return self._load_full_order(db, order.id)

    def delete(self, db: Session, order_id: UUID) -> dict:
        order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"success": False, "message": "Order not found"})
        if order.status != OrderStatus.CANCELLED:
            # Restore stock
            for item in order.items:
                product = db.query(Product).filter(Product.id == item.product_id).with_for_update().first()
                if product:
                    product.quantity_in_stock += item.quantity
        db.delete(order)
        db.commit()
        return {"success": True, "message": "Order deleted and stock restored"}

    def _load_full_order(self, db: Session, order_id: UUID) -> Order:
        order = (
            db.query(Order)
            .options(joinedload(Order.customer), joinedload(Order.items).joinedload(OrderItem.product))
            .filter(Order.id == order_id)
            .first()
        )
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"success": False, "message": "Order not found"})
        order.item_count = len(order.items)
        return order

    def get_monthly_stats(self, db: Session) -> list[dict]:
        results = (
            db.query(
                func.date_trunc("month", Order.created_at).label("month"),
                func.count(Order.id).label("count"),
                func.sum(Order.total_amount).label("revenue"),
            )
            .group_by(func.date_trunc("month", Order.created_at))
            .order_by(func.date_trunc("month", Order.created_at))
            .limit(12)
            .all()
        )
        return [{"month": str(r.month)[:7], "count": r.count, "revenue": float(r.revenue or 0)} for r in results]


order_service = OrderService()
