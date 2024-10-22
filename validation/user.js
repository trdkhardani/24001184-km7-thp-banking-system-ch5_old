import Joi from "joi";

function validateUser(user){
    const JoiSchema = Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        identity_type: Joi.string().valid('Silver').valid('Gold').valid('Platinum').required(),
        identity_number: Joi.string().required(),
        address: Joi.string().required(),
    }).options({abortEarly: false});

    return JoiSchema.validate(user)
}

export default validateUser;