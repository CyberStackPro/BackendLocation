const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const useragent = require("express-useragent");
const requestIp = require("request-ip");
const User = require("./models/User");
const getLocationAndDeviceInfo = require("./middleawre/getLocation");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
const corsOptions = {
  origin: ["https://locationdetect.onrender.com", "http://localhost:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(useragent.express());
app.use(requestIp.mw());

// MongoDB Connection
const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://Freedom12:Freedom12@cluster0.89dslq4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
if (!uri) {
  throw new Error("MONGODB_URI environment variable is not set");
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  // maxPoolSize: 50,
  // wtimeoutMS: 2500,
  connectTimeoutMS: 30000,
});

// Connect to MongoDB function
async function connectDB() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB!");
    return client.db(process.env.DB_NAME); // Replace with your database name
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}
// Add a test connection on startup
connectDB()
  .then(() => {
    console.log(`Connected to database: ${process.env.DB_NAME}`);
  })
  .catch((error) => {
    console.error("Failed to connect to database on startup:", error);
    process.exit(1);
  });

// Modified registration endpoint
app.post("/api/register", async (req, res) => {
  try {
    const db = await connectDB();
    if (!db) {
      throw new Error("Database connection failed");
    }
    const usersCollection = db.collection("users");

    const { username, password, email } = req.body;
    const locationAndDeviceInfo = getLocationAndDeviceInfo(req);
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user exists
    const existingUser = await usersCollection.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ error: "Username or email already exists" });
    }

    const user = {
      username,
      password: hashedPassword,
      email,
      ...locationAndDeviceInfo,
      lastLogin: new Date(),
      loginHistory: [
        {
          timestamp: new Date(),
          location: locationAndDeviceInfo.location.current,
          ip: locationAndDeviceInfo.networkInfo.ip,
          deviceInfo: locationAndDeviceInfo.deviceInfo,
          success: true,
        },
      ],
    };

    const result = await usersCollection.insertOne(user);
    res.status(201).json({
      message: "User registered successfully",
      locationInfo: locationAndDeviceInfo,
      userId: result.insertedId,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res
      .status(500)
      .json({ error: "Registration failed. Please try again later." });
  }
});

// Modified login endpoint
app.post("/api/login", async (req, res) => {
  try {
    const db = await connectDB();
    const usersCollection = db.collection("users");

    const { username, password } = req.body;
    const locationAndDeviceInfo = getLocationAndDeviceInfo(req);

    const user = await usersCollection.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $push: {
            loginHistory: {
              timestamp: new Date(),
              location: locationAndDeviceInfo.location.current,
              ip: locationAndDeviceInfo.networkInfo.ip,
              deviceInfo: locationAndDeviceInfo.deviceInfo,
              success: false,
            },
          },
        }
      );
      return res.status(401).json({ error: "Invalid credentials" });
    }

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          location: locationAndDeviceInfo.location,
          deviceInfo: locationAndDeviceInfo.deviceInfo,
          networkInfo: locationAndDeviceInfo.networkInfo,
          lastLogin: new Date(),
        },
        $push: {
          loginHistory: {
            timestamp: new Date(),
            location: locationAndDeviceInfo.location.current,
            ip: locationAndDeviceInfo.networkInfo.ip,
            deviceInfo: locationAndDeviceInfo.deviceInfo,
            success: true,
          },
        },
      }
    );

    res.json({
      message: "Login successful",
      user,
      locationInfo: locationAndDeviceInfo,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed. Please try again later." });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Handle process termination
process.on("SIGINT", async () => {
  try {
    await client.close();
    console.log("MongoDB connection closed.");
    process.exit(0);
  } catch (error) {
    console.error("Error while closing MongoDB connection:", error);
    process.exit(1);
  }
});
