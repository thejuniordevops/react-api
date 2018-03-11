let mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const _ = require('lodash');
const { SECRET_KEY, GEN_SALT_ROUND } = require('../constants');

let Schema = mongoose.Schema;
const userSchema = new Schema({
  userName: {
    type: String,
    unique: true,
    trim: true,
    minlength: 3,
    required: [true, 'Username required'],
    validate: {
      validator: (value) => {
        // first and last char cant be separator
        // but internal separator allowed 
        return /^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/.test(value);
      },
      message: '{VALUE} is not valid username'
    }
  },
  password: {
    type: String,
    minlength: 6,
    required: [true, 'Password required']
  },
  tokens: [{
    access: {
      type: String,
      required: [true, 'Token access type required']
    },
    token: {
      type: String,
      required: [true, 'Token required']
    }
  }]
});

/* Instance Method ==================================== */
userSchema.methods.toJSON = function () {
  let user = this;
  const userObject = user.toObject();
  
  return _.pick(userObject, ['_id', 'userName']);
};

userSchema.methods.generateAuthToken = function () {
  let user = this;
  const access = 'auth';
  const token = jwt.sign({ _id: user._id.toHexString(), access }, SECRET_KEY).toString();

  user.tokens = user.tokens.concat([{ access, token }]);
  return user.save().then(() => token);
};

userSchema.methods.removeToken = function (token) {
  let user = this;
  return user.update({
    $pull: {
      tokens: {token}
    }
  })
}

/* Model Method ==================================== */
userSchema.statics.findByToken = function (token) {
  let User = this;
  let decoded;

  try {
    decoded = jwt.verify(token, SECRET_KEY);
  } catch(e) {
    return Promise.reject();
  }
  return User.findOne({
    '_id': decoded._id,
    'tokens.token': token,
    'tokens.access': decoded.access
  })
};

userSchema.statics.findByCredentials = function (userName, password) {
  let User = this;

  return User.findOne({ userName }).then((user) => {
    if (!user) {
      return Promise.reject();
    }
    return new Promise((resolve, reject) => {
      bcrypt.compare(password, user.password, (err, res) => {
        if (res) {
          resolve(user);
        } else {
          reject();
        }
      });
    })
  })
}

/* Bcrypt before save ============================== */
userSchema.pre('save', function (next) {
  let user = this;

  // when the update included password
  if (user.isModified('password')) {
    bcrypt.genSalt(GEN_SALT_ROUND, (err, salt) => {
      bcrypt.hash(user.password, salt, (err, hash) => {
        user.password = hash;
        next();
      })
    });
  } else {
    next();
  }
})

module.exports = userSchema;