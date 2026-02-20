
/**
 * Calculates the Fairness Score (0-100) based on weighted factors.
 * 
 * Formula:
 * Price Score (40%): Compares dealer price vs market average.
 * APR Score (25%): Penalizes high interest rates.
 * Fees Score (15%): Penalizes high fees.
 * Term Score (20%): Penalizes very short (<12) or very long (>72) terms.
 * 
 * @param {Object} data - { price, marketAvg, apr, fees, term }
 * @returns {Object} - { totalScore, breakdown: { price, apr, fees, term } }
 */
export const calculateFairnessScore = ({ price, marketAvg, apr, fees, term }) => {
    let priceScore = 100;
    let aprScore = 100;
    let feesScore = 100;
    let termScore = 100;

    // 1. Price Score (40%)
    if (price > marketAvg) {
        const overPercentage = ((price - marketAvg) / marketAvg) * 100;
        // Each 1% overpayment loses 3 points
        priceScore = Math.max(0, 100 - (overPercentage * 3));
    } else {
        // Bonus for underpaying? (Optional, capping at 100 for now)
        priceScore = 100;
    }

    // 2. APR Score (25%)
    if (apr > 10) {
        aprScore = Math.max(0, 100 - ((apr - 10) * 15)); // Loses 15 pts per % over 10
    } else if (apr >= 8) {
        aprScore = Math.max(0, 100 - ((apr - 8) * 10)); // Loses 10 pts per % over 8
    } else if (apr >= 6) {
        aprScore = Math.max(0, 100 - ((apr - 6) * 5)); // Loses 5 pts per % over 6
    }
    // < 6% is perfect (100)

    // 3. Fees Score (15%)
    if (fees > 2000) feesScore = 70; // -30 pts
    else if (fees >= 1000) feesScore = 80; // -20 pts
    else feesScore = 90; // < 1000 (-10 pts as per prompt, implying 90 is max or baseline is 100-10?)
    // Prompt says "< $1000 = -10 pts". If baseline is 100, then 90.

    // 4. Term Score (20%)
    if (term < 12) termScore = 70; // -30 pts
    else if (term > 72) termScore = 75; // -25 pts
    else if (term >= 60) termScore = 90; // -10 pts
    // 12-59 months is perfect (100)

    const totalScore = (
        (priceScore * 0.40) +
        (aprScore * 0.25) +
        (feesScore * 0.15) +
        (termScore * 0.20)
    );

    return {
        totalScore: Math.round(totalScore),
        breakdown: {
            price: Math.round(priceScore),
            apr: Math.round(aprScore),
            fees: Math.round(feesScore),
            term: Math.round(termScore)
        }
    };
};
