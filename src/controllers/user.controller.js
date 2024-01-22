import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  //   res.status(200).json({
  //     message: "ok",
  //   });
  //    Create user
  //    Get user details from frontend
  //    Validation - not empty
  //    Check if user already exists: usename, email
  //    Check for images, check for avatar
  //    Upload them in to cloudinary
  //    Create user object - create entry in db
  //    Remove password and refresh token field from response
  //    Check for user creation
  //    return res
  const { fullName, email, username, password } = req.body;
  //   console.log(req.body);
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

  const avatarLoacalPath = req.files?.avatar[0]?.path;
  //   const coverImageLoacalPath = req.files?.coverImage[0]?.path;
  //   console.log(req.files);

  let coverImageLoacalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLoacalPath = req.files.coverImage[0].path;
  }

  if (!avatarLoacalPath) {
    throw new ApiError(400, "Avatar File is Required");
  }

  const avatar = await uploadOnCloudinary(avatarLoacalPath);
  const coverImage = await uploadOnCloudinary(coverImageLoacalPath);
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

export { registerUser };
