const AccountHead = require("../model/accountHead.model");

const createAccountHead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, type } = req.body;
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: "Name and type are required",
      });
    }
    const existing = await AccountHead.findOne({
      userId,
      name,
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Account head already exists",
      });
    }

    const accountHead = await AccountHead.create({
      userId,
      name,
      type,
    });

    return res.status(201).json({
      success: true,
      message: "Account head created successfully",
      data: accountHead,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAccountHeads = async (req, res) => {
  try {
    const userId = req.user._id;

    let { page = 1, limit = process.env.DEFAULT_PAGE_SIZE, search = "", type } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const skip = (page - 1) * limit;

    const query = {
      userId,
      isActive: true,
    };

    if (type) {
      query.type = type;
    }

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const [data, total] = await Promise.all([
      AccountHead.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),

      AccountHead.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getSingleAccountHead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const accountHead = await AccountHead.findOne({
      _id: id,
      userId,
      isActive: true,
    });

    if (!accountHead) {
      return res.status(404).json({
        success: false,
        message: "Account head not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: accountHead,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateAccountHead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { name, type } = req.body;

    const accountHead = await AccountHead.findOne({
      _id: id,
      userId,
    });

    if (!accountHead) {
      return res.status(404).json({
        success: false,
        message: "Account head not found",
      });
    }

    if (name) accountHead.name = name;
    if (type) accountHead.type = type;

    await accountHead.save();

    return res.status(200).json({
      success: true,
      message: "Account head updated successfully",
      data: accountHead,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const inactiveAccountHead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const accountHead = await AccountHead.findOne({
      _id: id,
      userId,
    });

    if (!accountHead) {
      return res.status(404).json({
        success: false,
        message: "Account head not found",
      });
    }

    accountHead.isActive = false;

    await accountHead.save();

    return res.status(200).json({
      success: true,
      message: "Account head deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createAccountHead,
  getAccountHeads,
  getSingleAccountHead,
  updateAccountHead,
  inactiveAccountHead,
};
