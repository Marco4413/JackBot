const MathJS = require("mathjs");

const _MathContext = MathJS.create();

_MathContext.config({
    "number": "number"
});

_MathContext.import([
    MathJS.evaluateDependencies,
    MathJS.unaryMinusDependencies,
    MathJS.unaryPlusDependencies,
    MathJS.absDependencies,
    MathJS.ceilDependencies,
    MathJS.cubeDependencies,
    MathJS.expDependencies,
    MathJS.floorDependencies,
    MathJS.gcdDependencies,
    MathJS.lcmDependencies,
    MathJS.log10Dependencies,
    MathJS.log2Dependencies,
    MathJS.modDependencies,
    MathJS.multiplyDependencies,
    MathJS.nthRootDependencies,
    MathJS.signDependencies,
    MathJS.sqrtDependencies,
    MathJS.squareDependencies,
    MathJS.subtractDependencies,
    MathJS.bitAndDependencies,
    MathJS.bitNotDependencies,
    MathJS.bitOrDependencies,
    MathJS.bitXorDependencies,
    MathJS.powDependencies,
    MathJS.roundDependencies,
    MathJS.logDependencies,
    MathJS.leftShiftDependencies,
    MathJS.rightArithShiftDependencies,
    MathJS.rightLogShiftDependencies,
    MathJS.maxDependencies,
    MathJS.minDependencies,
    MathJS.acosDependencies,
    MathJS.acotDependencies,
    MathJS.acscDependencies,
    MathJS.asecDependencies,
    MathJS.asinDependencies,
    MathJS.atanDependencies,
    MathJS.cosDependencies,
    MathJS.cotDependencies,
    MathJS.cscDependencies,
    MathJS.secDependencies,
    MathJS.sinDependencies,
    MathJS.tanDependencies,
    MathJS.divideDependencies,
    MathJS.sumDependencies,
    MathJS.meanDependencies,
    MathJS.medianDependencies,
    MathJS.varianceDependencies,
    MathJS.factorialDependencies,
    MathJS.randomDependencies,
    MathJS.randomIntDependencies,
    MathJS.eDependencies,
    MathJS.phiDependencies,
    MathJS.piDependencies,
]);

const _eval = _MathContext.evaluate;
module.exports = {
    "evaluate": _eval,
    /**
     * Evaluates the specified Math Expression to a Number, if a ResultSet is the result then the first entry will be returned
     * @param {MathJS.MathExpression|MathJS.MathExpression[]} expr
     * @param {Object?} [scope]
     * @returns {Number}
     */
    "EvaluateToNumber": (expr, scope) => {
        const evalExpr = _eval(expr, scope ?? { });
        if (typeof evalExpr === "number") return evalExpr;
        return evalExpr.entries == null ? Number.NaN : evalExpr.entries[0];
    }
};

_MathContext.import({
    "import":     () => { throw new Error("Function import is disabled.")     },
    "createUnit": () => { throw new Error("Function createUnit is disabled.") },
    "evaluate":   () => { throw new Error("Function evaluate is disabled.")   },
    "parse":      () => { throw new Error("Function parse is disabled.")      },
    "simplify":   () => { throw new Error("Function simplify is disabled.")   },
    "derivative": () => { throw new Error("Function derivative is disabled.") }
}, { override: true });
