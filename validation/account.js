import Joi from "joi";

function validateAccount(account){
    const JoiSchema = Joi.object({
        user_id: Joi.number().positive().required(),
        bank_name: Joi.string().required(),
        bank_account_number: Joi.string().min(10).required(),
    }).options({abortEarly: false});

    return JoiSchema.validate(account)
}

export default validateAccount;