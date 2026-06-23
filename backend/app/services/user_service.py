from sqlalchemy.orm import Session
from uuid import UUID
from fastapi import HTTPException, status
from app.models.user import User, UserRole
from app.schemas.user import UserCreate
from app.core.security import get_password_hash, verify_password


class UserService:
    def create(self, db: Session, payload: UserCreate) -> User:
        if db.query(User).filter(User.username == payload.username).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail={"success": False, "message": "Username already taken"})
        if db.query(User).filter(User.email == payload.email).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail={"success": False, "message": "Email already registered"})
        user = User(
            username=payload.username,
            email=payload.email,
            hashed_password=get_password_hash(payload.password),
            role=payload.role,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def authenticate(self, db: Session, username: str, password: str) -> User:
        user = db.query(User).filter(User.username == username, User.is_active == True).first()
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail={"success": False, "message": "Invalid credentials"})
        return user

    def get_by_id(self, db: Session, user_id: UUID) -> User:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"success": False, "message": "User not found"})
        return user

    def seed_admin(self, db: Session):
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            self.create(db, UserCreate(username="admin", email="admin@inventory.com", password="admin123", role=UserRole.ADMIN))


user_service = UserService()
