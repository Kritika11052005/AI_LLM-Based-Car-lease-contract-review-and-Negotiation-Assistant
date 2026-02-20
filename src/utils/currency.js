
/**
 * Converts USD to INR.
 * Using a fixed rate for prototype simplicity. can be updated to fetch live rates.
 */
const USD_TO_INR_RATE = 84.5; // Approx current rate

export const convertToINR = (usdAmount) => {
    if (usdAmount === undefined || usdAmount === null) return 0;

    let amount = usdAmount;
    if (typeof usdAmount === 'string') {
        amount = parseFloat(usdAmount.replace(/[^0-9.]/g, ''));
    }

    if (isNaN(amount)) return 0;
    return Math.round(amount * USD_TO_INR_RATE);
};

export const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
};
