import Joi from "joi";

function validateCredentials(account){
    const JoiSchema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    }).options({abortEarly: false});

    return JoiSchema.validate(account)
}

export default validateCredentials;