import { MongoClient } from "mongodb";

let dbInstance = null;

export async function connectToMongoDB() {
  if (!dbInstance) {
    try {
      const client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      dbInstance = client.db("TrainingIT");
      console.log("Connected to MongoDB");
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error);
      process.exit(1);
    }
  }
  return dbInstance;
}

export async function registerNewUser(userId, userName, userUsername) {
  const db = await connectToMongoDB();
  const usersCollection = db.collection("User");

  const user = await usersCollection.findOne({ id: userId });
  if (!user) {
    await usersCollection.insertOne({
      id: userId,
      name: userName,
      username: userUsername,
      startedUsingBot: new Date(),
    });
    console.log(`Новый пользователь ${userName} зарегистрирован.`);
  }
}
