# AI Academic Companion - Backend

Flask backend for the AI Academic Companion Learning Management System.

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Environment Configuration

The `.env` file is already configured with default values. Update these in production:
- `SECRET_KEY` - Flask secret key
- `JWT_SECRET_KEY` - JWT token secret
- `DATABASE_URL` - Database connection string

### 3. Run the Application

```bash
python app.py
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "secure_password",
  "full_name": "John Doe",
  "date_of_birth": "2000-01-15"
}
```

Response:
```json
{
  "message": "User registered successfully",
  "student_id": "STU2024000001",
  "user": {
    "student_id": "STU2024000001",
    "email": "student@example.com",
    "full_name": "John Doe",
    "age": 24,
    ...
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "secure_password"
}
```

Response:
```json
{
  "message": "Login successful",
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {...}
}
```

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer {access_token}
```

#### Update Profile
```http
PUT /api/auth/profile
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "full_name": "Updated Name",
  "learning_style": "visual",
  "performance_level": "intermediate"
}
```

## Database

Currently using SQLite for development (`academic_companion.db`).

### Models
- **User** - Student information with unique student ID
- **Course** - Course catalog
- **Enrollment** - Student course enrollments
- **Topic** - Course topics/modules

## Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ CORS protection
- ✅ Email uniqueness validation
- ✅ Unique student ID generation

## Next Steps (Phase 2+)

- Course search and enrollment APIs
- Learning path management
- Quiz generation and evaluation
- Google AI integration
- Analytics and recommendations
