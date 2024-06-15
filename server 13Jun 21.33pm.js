// =============================
// DEPEDENCIES INITIALIZATION
// =============================
const express = require("express")
const app = express()
require("dotenv").config()
const port = process.env.PORT
const jwt = require("jsonwebtoken")
const cors = require("cors")
const crypto = require("crypto")
const cookieParser = require("cookie-parser")

// =============================
// DATABASE INITIALIZATION WITH FS
// =============================
const fs = require("fs")
// const { parse } = require("path")
// const { pathToFileURL } = require("url")
const pathToUserDatabase = "./userdatabase.json"
let tempUserDataArray = []

try {
  const fsReadUserData = fs.readFileSync(pathToUserDatabase, "utf8")
  tempUserDataArray = JSON.parse(fsReadUserData)

  //just to sort the array of database
  tempUserDataArray.sort((a, b) => {
    parseInt(a.id) - parseInt(b.id)
  })

  // console.log(tempUserDataArray)
} catch (error) {
  console.error("Failed to Read Database", error)
}

// =============================
//MIDDLEWARE
// =============================
app.use(express.json())
app.use(
  cors({
    origin: ["http://localhost:5500", "http://127.0.0.1:5500", "http://127.0.0.1:5174", "http://localhost:5174"],
    credentials: true,
  })
)
app.use(cookieParser())

function generateUID() {
  tempUserDataArray.forEach((user) => {
    const randomUID = crypto.randomUUID()

    if (!("UID" in user) || user.UID === null) {
      user.UID = randomUID

      // console.log("USERNAME which has no UID", user.username, "[blank UID]")
    } else {
      // console.log(`USERNAME which has UID", ${user.username}, ========> UID: ${user.UID}`)
    }
  })
  console.log(tempUserDataArray)
  fs.writeFileSync(pathToUserDatabase, JSON.stringify(tempUserDataArray, null, 2))
}

// generateUID()

app.post("/signin", (req, res) => {
  const { username, password } = req.body

  try {
    //check both username and password!
    // =======================================
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required!" })
    }
    const findUserIndex = tempUserDataArray.findIndex((user) => user.username === username)

    //check if there any user found
    // =======================================

    if (findUserIndex !== -1) {
      const user = tempUserDataArray[findUserIndex]

      //check if password is matched!
      // =======================================

      if (user.password === password) {
        const firstname = user.firstname
        const lastname = user.lastname
        const age = user.age
        const email = user.email
        const username = user.username
        const userUID = user.UID

        const token = jwt.sign({ firstname, lastname, age, userUID, email }, process.env.JWT_SECRET_KEY, { expiresIn: 60 * 60 })
        // console.log(token)

        res
          .cookie("jwtToken", token, { httpOnly: true })
          // .cookie("userUID", userUID)
          // .cookie("username", username)
          .status(200)
          // .set("UID", userUID)
          // .set("Access-Control-Expose-Headers", "UID")
          .send("test")

        // console.log(userUID)
        // console.log(token)
      } else {
        return res.status(401).json({ error: "Wrong username or password!" })
      }
    } else {
      return res.status(403).json({ error: "No User Found! Please Sign up." })
    }
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: "Internal Server Error from loginpage" })
  }
})

// =============================
// - - -- MIDDLEWARE - - - - - -
// =============================

// function verifyJwtToken(req, res, next) {
//
//   const { token } = req.body
//
//   if (!token) {
//     // return res.redirect("http://127.0.0.1:5500/basicclient/login.html")
//     return res.status(301).json({ error: "Missing Token!" })
//   }
//
//   try {
//     const decode = jwt.verify(token, process.env.JWT_SECRET_KEY)
//     req.user = decode
//     next()
//     // return res.status(200).json({ message: "Successful", user: decode })
//   } catch (error) {
//     return res.status(400).json({ error: "Unauthorized tk!" })
//   }
// }

function verifyJwtToken(req, res, next) {
  const token = req.cookies.jwtToken

  if (!token) {
    return res.status(408).json({ error: "No Token Found!" })
  }

  try {
    const encode = jwt.verify(token, process.env.JWT_SECRET_KEY)
    // console.log("token", token)

    const tokenExpTime = encode.exp * 1000

    req.user = encode

    next()
    // return res.status(200).json({ message: token, userID: encode })
  } catch (error) {
    console.log(error)
    return res.status(500).json(error)
  }
}

// =============================
//ROUTING
// =============================

app.get("/users", verifyJwtToken, (req, res) => {
  // const { token } = req.body

  try {
    return res.status(200).json(tempUserDataArray)
  } catch (error) {
    if (error.code === "ENOENT") {
      tempUserDataArray = []
    } else {
      return res.status(500).json({ error: "Internal Server Error" })
    }
  }
})

app.post("/users/addnewuser", (req, res) => {
  const { id, firstname, lastname, age, email, username, password } = req.body

  try {
    if (!id || !firstname || !age || !email || !username || !password) {
      console.error(error)
      return res.status(400).json({ message: "Please Input all the required fields" })
    }

    const existingUsername = tempUserDataArray.find((user) => user.username === username)
    const existingEmail = tempUserDataArray.find((user) => user.email === email)

    if (existingUsername && existingEmail) {
      return res.status(409).json({ ERROR: `User with username ${username} and email ${email}  already exist!` })
    } else if (existingUsername) {
      return res.status(409).json({ ERROR: `User with username ${username} already exist!` })
    } else if (existingEmail) {
      return res.status(409).json({ ERROR: `User with email ${email} already exist!` })
    }

    let newUserData = { id, firstname, lastname, age, email, username, password }
    tempUserDataArray.push(newUserData)
    tempUserDataArray.sort((a, b) => parseInt(a.id) - parseInt(b.id))

    fs.writeFileSync(pathToUserDatabase, JSON.stringify(tempUserDataArray, null, 2))
    return res.status(201).json({ message: `User with username ${username} Successfully created!` })
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" })
  }
})

app.delete("/users/deleteuser/:id", verifyJwtToken, (req, res) => {
  const userID = req.params.id

  const loggedInUser = req.user.username
  console.log("loggedInUser", loggedInUser)

  if (loggedInUser !== userID) {
    console.error("FORBIDDEN")
    return res.status(403).json({ ERROR: "FORBIDDEN ACTION!" })
  }
  try {
    const findUserIndex = tempUserDataArray.findIndex((user) => user.username === loggedInUser)

    if (findUserIndex !== -1) {
      tempUserDataArray.splice(findUserIndex, 1)
      tempUserDataArray.sort((a, b) => parseInt(a.id) - parseInt(b.id))

      fs.writeFileSync(pathToUserDatabase, JSON.stringify(tempUserDataArray, null, 2))

      return res.status(200).json({ message: `User with username ${userID} successfully deleted!` })
    }
    console.log("findUserIndex", findUserIndex)
    console.log("userID", userID)

    return res.status(404).json({ error: "User Not Found!" })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ error: "Internal Server Error" })
  }
})

app.patch("/users/edituser/:id", verifyJwtToken, (req, res) => {
  const userQuery = req.params.id
  const { firstname, lastname, age } = req.body

  const loggedInUser = req.user.userUID

  console.log("userQuery", userQuery)
  console.log("loggedInUser", loggedInUser)

  try {
    console.log(loggedInUser)
    // res.json({ userUID: loggedInUser })
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: error.message })
  }

  if (userQuery !== loggedInUser) {
    return res.status(403).json({ ERROR: "FORBIDDEN ACTION!" })
  }

  try {
    const findUserIndex = tempUserDataArray.findIndex((user) => user.UID === loggedInUser)
    if (findUserIndex !== -1) {
      console.log(findUserIndex)

      if (!firstname && !lastname && !age) {
        console.log("No changed has been made!")

        return res.status(400).json({ ERROR: "No changed has been made!" })
      }

      console.log("firstname", firstname)

      // NOTE =====> [ cannot change use ID,username, password and email ]
      // tempUserDataArray[findUserIndex].id = id ?? tempUserDataArray[findUserIndex].id
      // tempUserDataArray[findUserIndex].email = email ?? tempUserDataArray[findUserIndex].email
      // tempUserDataArray[findUserIndex].password = password ?? tempUserDataArray[findUserIndex].password
      // tempUserDataArray[findUserIndex].username = username ?? tempUserDataArray[findUserIndex].username

      tempUserDataArray[findUserIndex].firstname = firstname ?? tempUserDataArray[findUserIndex].firstname
      tempUserDataArray[findUserIndex].lastname = lastname ?? tempUserDataArray[findUserIndex].lastname
      tempUserDataArray[findUserIndex].age = age ?? tempUserDataArray[findUserIndex].age

      fs.writeFileSync(pathToUserDatabase, JSON.stringify(tempUserDataArray, null, 2))

      return res.status(200).json({ message: `User with ID ${loggedInUser} successfully edited!` })
    }
    console.log(`No User with UID ${userQuery} !`)
    return res.status(404).json({ message: `No User with UID ${userQuery} found!` })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ error: "Internal Server Error" })
  }
})

app.post("/logout", (req, res) => {
  try {
    res.clearCookie("jwtToken", { httpOnly: true })
    res.clearCookie("userUID")
    res.status(200).json({ message: "Success Logout!" })
    console.log("Logged out!")
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error code:lg" })
  }
})

//
// app.post("/dashboard", verifyJwtToken, (req, res) => {
//   // const username = JSON.parse(localStorage.getItem("username"))
//   const { username } = req.body
//
//   try {
//     if (!username || username === null) {
//       return res.status(400).json({ error: "No Username!" })
//     }
//
//     const loggedInUserIndex = tempUserDataArray.findIndex((user) => user.username === username)
//
//     if (loggedInUserIndex !== -1) {
//       return res.status(200).json(tempUserDataArray[loggedInUserIndex])
//       console.log(loggedInUserIndex)
//     }
//     return res.status(403).json({ error: "Forbidden Action" })
//     console.log(loggedInUserIndex)
//   } catch (error) {
//     // console.log(error, "USER REDIRECTED TO LOGIN PAGE")
//     return res.status(500).json({ error: "Internal Server Error" })
//   }
// })

app.get("/dashboard", verifyJwtToken, (req, res) => {
  const user = req.user
  const userUID = user.userUID
  const exptime = user.exp

  try {
    console.log(user)

    const loggedInUser = tempUserDataArray.find((someone) => someone.UID === userUID)
    const dashboardProfile = {
      firstName: loggedInUser.firstname,
      lastName: loggedInUser.lastname,
      age: loggedInUser.age,
      email: loggedInUser.email,
      userUID: loggedInUser.UID,
      exp: exptime,
    }
    // console.log("userUID", user)
    return res.status(200).json({ message: "Welcome to Dashboard!", dashboardProfile })
  } catch (err) {
    return res.status(500).json({ error: "Dashboard Server Error!" })
  }
})

// =============================
// LISTENING
// =============================
app.listen(port, () => {
  console.log(`Server is Running on PORT ${port}`)
})
