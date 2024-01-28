import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Generate Refresh and Access Token
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Save password for Refresh Token
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); // For not ask password again and again

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while genertaing Access token and Refresh Token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //   res.status(200).json({
  //     message: "ok",
  //   });

  /*
  **Steps and Algorithm of Register User**
  1. Create user
  2. Get user details from frontend
  3. Validation - not empty
  4. Check if user already exists: usename, email
  5. Check for images, check for avatar
  6. Upload them in to cloudinary
  7. Create user object - create entry in db
  8. Remove password and refresh token field from response
  9. Check for user creation
  10. return res
  */

  const { fullName, email, username, password } = req.body;
  console.log(req.body);
  //   console.log("Email:", email);
  //   console.log("username:", username);
  //   console.log("password:", password);

  //   if (fullName == "") {
  //     throw new ApiError(400, "Fullname is required");
  //   }

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with username and email already exist");
  }

  //   const avatarLocalPath = req.files?.avatar[0]?.path;
  //   const coverImageLocalPath = req.files?.coverImage[0]?.path;
  //   console.log(req.files);
  const avatarLocalPath =
    req.files?.avatar &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar.length > 0
      ? req.files.avatar[0].path
      : undefined;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar File is Required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  //   console.log(avatar);

  if (!avatar) {
    throw new ApiError(400, "Avatar File is Required");
  }

  const userEntry = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(userEntry._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  /*
  **Steps and Algorithm of Login User**
  1. Get data from req body
  2. Check email and username
  3. Find the user is thier or not
  4. Check password
  5. Generate access and refresh token if user found in data
  6. Send Cookie
  10. return res
  */

  const { email, username, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "Username or Email is required");
  }

  const userCheck = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!userCheck) {
    throw new ApiError(401, "User does not exist");
  }

  const isPasswordValid = await userCheck.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = generateAccessAndRefreshToken(
    userCheck._id
  );

  const loggedInUser = await User.findById(userCheck._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          userCheck: loggedInUser,
          accessToken,
          refreshToken,
        }, // This is good If User want to save Accesstoken and Refreshtoken from itself.
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  /*
  **Steps and Algorithm of Logout User**
  1. Clear cookies
  2. Clear refresh token from database
  */

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "User logged Out Successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  /*
  **Steps and Algorithm for refresh access token**
  1. 
  */

  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Request");
  }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
