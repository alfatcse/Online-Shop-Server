const express = require("express");
const cors = require("cors");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_KEY);
const jwt = require("jsonwebtoken");
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");
const app = express();
app.use(cors());
app.use(express.json());
const port = 5009;
const http = require("http");
const { Server } = require("socket.io");
const { isObject } = require("util");
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.icjdeya.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
function jwtCheck(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log("authorization::", authHeader);
  if (!authHeader) {
    return res.status(401).send("unAuthorized Access");
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (e, decoded) {
    if (e) {
      return res.status(403).send({ message: "forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
}
async function run() {
  const phoneCollection = client.db("SellNow").collection("Phone");
  const bookingCollection = client.db("SellNow").collection("booking");
  const userCollection = client.db("SellNow").collection("Users");
  const ChatCollection = client.db("SellNow").collection("Chat");
  try {
    app.get("/catagory", async (req, res) => {
      const page=req.query.page;
      const size=parseInt(req.query.size);
      console.log(page,size);
      const query = {};
      const cursor = await phoneCollection.find(query);
      const products=await cursor.skip(page*size).limit(size).toArray();
      const count=await phoneCollection.estimatedDocumentCount();
      res.send({count,products});
    });
    app.get("/chat/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      // io.on("connection", (socket) => {
      //   console.log("new user connected");
      //   socket.on("disconnect", (socket) => {
      //     console.log("user disconnect");
      //   });
      //   socket.on('chatId',()=>{

      //     socket.join(id)
      //   })
      //   // socket.join(id);
      //   socket.on("reactEvent", (data) => {
      //     //chat is receiving here
      //     console.log(data);
      //     //chat is transmitting here
      //     socket.to(id).emit("showMessage",data);
      //   });
      // });
      io.on("connection", (socket) => {
        //   console.log("new user connected");
        //   socket.on("disconnect", (socket) => {
        //     console.log("User disconnect");
        //   });
        //   socket.send("socket send");
        //   socket.on("testEvent", (data) => {
        //     console.log(data);
        //   });
        //   io.sockets.emit("fifa", "hello football");
        socket.on("joinRoom", (data) => {
          socket.join(data);
        });
        socket.on("reactEvent", (data) => {
          console.log(data);
          // socket.broadcast.emit("showMessage", data);
          require('events').EventEmitter.prototype._maxListeners = 100;
          socket.to(data.room).emit("showMessage", data);
        });
      });
      res.send(id);
    });
    app.get("/bookingspayment/:id", async (req, res) => {
      const id = req.params.id;
      const q = { _id: ObjectId(id) };
      const result = await bookingCollection.findOne(q);
      //console.log(result);
      res.send(result);
    });
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      //  console.log(email);
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "3d",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });
    app.get("/bookings", jwtCheck, async (req, res) => {
      //   console.log("JWTV");
      const email = req.query.email;
      const decodeEmail = req.decoded.email;
      console.log(email, decodeEmail);
      if (email !== decodeEmail) {
        return res.status(403).send({ message: "forbidden" });
      }
      const query = {
        buyerEmail: email,
      };
      const booking = await bookingCollection.find(query).toArray();
      // console.log(booking);
      res.send(booking);
    });
    app.get("/allbuyers", jwtCheck, async (req, res) => {
      const email = req.query.email;
      const decodeEmail = req.decoded.email;
      // console.log(email, decodeEmail);
      if (email !== decodeEmail) {
        return res.status(403).send({ message: "forbidden" });
      }
      const query = {
        userType: "Buyer",
      };
      const allbuyers = await userCollection.find(query).toArray();
      // console.log(allbuyers);
      res.send(allbuyers);
    });
    app.get("/allsellers", jwtCheck, async (req, res) => {
      const email = req.query.email;
      const decodeEmail = req.decoded.email;
      //  console.log(email, decodeEmail);
      if (email !== decodeEmail) {
        return res.status(403).send({ message: "forbidden" });
      }
      const query = {
        userType: "Seller",
      };
      const allsellers = await userCollection.find(query).toArray();
      // console.log(allsellers);
      res.send(allsellers);
    });
    app.get("/sellerproducts", jwtCheck, async (req, res) => {
      const email = req.query.email;
      console.log("all product of seller", email);
      const decodeEmail = req.decoded.email;
      // console.log(email, decodeEmail);
      if (email !== decodeEmail) {
        return res.status(403).send({ message: "forbidden" });
      }
      const q = { sellerEmail: email };
      const allProduct = await phoneCollection.find(q).toArray();
      //console.log(allProduct);
      res.send(allProduct);
    });
    app.get("/usertype", jwtCheck, async (req, res) => {
      const email = req.query.email;
      //  console.log(email);
      const q = { email };
      const user = await userCollection.findOne(q);
      // console.log(user.userType);
      res.send(user);
    });
    app.get("/username", jwtCheck, async (req, res) => {
      const email = req.query.email;
      //  console.log(email);
      const q = { email };
      const user = await userCollection.findOne(q);
      //  console.log(user.name);
      res.send(user);
    });
    app.get("/allbuyers/:email", jwtCheck, async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      const q = {
        selleremail: email,
      };
      const buyer = await bookingCollection.find(q).toArray();
      // console.log(buyer);
      res.send(buyer);
    });
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });
    app.post("/productupload", async (req, res) => {
      const product = req.body;
      //  console.log(product);
      const result = await phoneCollection.insertOne(product);
      res.send(result);
    });
    app.post("/create-payment-intent", async (req, res) => {
      const order = req.body;
      const price = order.productPrice;
      //   console.log("price", price);
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "eur",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    app.put("/productupdate/:id", async (req, res) => {
      const productId = req.params.id;
      // console.log(productId);
      const filter = { _id: ObjectId(productId) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          sellMode: "Advertised",
        },
      };
      const result = await phoneCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      //   console.log(result);
      res.send(result);
    });
    app.put("/paymentstatusupdate/:id", async (req, res) => {
      const productId = req.params.id;
      //console.log(productId);
      const filter = { _id: ObjectId(productId) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          paymentStatus: "Paid",
        },
      };
      const result = await bookingCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      const r = await bookingCollection.findOne(filter);
      //  console.log("rrrr", r.productId);
      const filter1 = { _id: ObjectId(r.productId) };
      const updatedDoc1 = {
        $set: {
          sellMode: "Sold",
        },
      };
      const updatePhoneStatus = await phoneCollection.updateOne(
        filter1,
        updatedDoc1,
        options
      );
      res.send(updatePhoneStatus);
    });
    app.put("/updatesellerstatus/:id", async (req, res) => {
      const sellerId = req.params.id;
      //  console.log(sellerId);
      const filter = { _id: ObjectId(sellerId) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          sellerStatus: "Verified",
        },
      };
      const result = await userCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      //  console.log(result);
      res.send(result);
    });
    app.put("/updatesellerstatusinbooking/:email", async (req, res) => {
      const email = req.params.email;
      //   console.log(email);
      const filter = { sellerEmail: email };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          sellerStatus: "Verified",
        },
      };
      const result = await phoneCollection.updateMany(
        filter,
        updatedDoc,
        options
      );
      // console.log(result);
      res.send(result);
    });
    app.delete("/productsdelete/:id", jwtCheck, async (req, res) => {
      const id = req.params.id;
      //  console.log(id);
      const filter = { _id: ObjectId(id) };
      const result = await phoneCollection.deleteOne(filter);
      res.send(result);
    });
    app.delete("/deleteuser/:id", async (req, res) => {
      const id = req.params.id;
      //  console.log(id);
      const filter = { _id: ObjectId(id) };
      const result = await userCollection.deleteOne(filter);
      res.send(result);
    });
  } finally {
  }
}
run().catch((e) => console.log(e));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/app.html");
});
httpServer.listen(5009, () => console.log("server is running"));
