import Joi from "joi";

function validateTransaction(transaction){
    const JoiSchema = Joi.object({
        source_account_id: Joi.number().positive().required(),
        destination_account_id: Joi.number().positive().required(),
        amount: Joi.number().positive().required(),
    }).options({abortEarly: false});

    return JoiSchema.validate(transaction)
}

export default validateTransaction;