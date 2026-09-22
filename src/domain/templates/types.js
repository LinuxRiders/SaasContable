/**
 * @fileoverview Tipos JSDoc para el motor de plantillas y reglas contables (data-model §4.1 - §4.5)
 */

/**
 * @typedef {Object} TemplateDefaults
 * @property {string} baseAccount - Cuenta base obligatoria
 * @property {string} taxAccount - Cuenta de IGV obligatoria
 * @property {string} counterpartAccount - Cuenta de contrapartida obligatoria
 * @property {boolean} appliesIgv - Si aplica IGV
 * @property {boolean} requiresCostCenter - Si requiere centro de costo
 * @property {string|null} defaultCostCenter - Centro de costo por defecto
 */

/**
 * @typedef {Object} SplitPart
 * @property {string} account - Cuenta contable de la parte
 * @property {string|null} [costCenter] - Centro de costo opcional
 * @property {number} basisPoints - Puntos básicos (suma exactamente 10000)
 */

/**
 * @typedef {Object} DocumentAction
 * @property {string} [taxAccount]
 * @property {string} [counterpartAccount]
 * @property {string|null} [defaultCostCenter]
 * @property {Record<string, string>} [tags]
 */

/**
 * @typedef {Object} LineAction
 * @property {string} [baseAccount]
 * @property {string|null} [costCenter]
 * @property {Record<string, string>} [tags]
 * @property {SplitPart[]} [split]
 */

/**
 * @typedef {"contains"|"startsWith"|"equals"|"gt"|"gte"|"lt"|"lte"|"between"|"in"} ComparatorOp
 */

/**
 * @typedef {Object} ComparisonCondition
 * @property {ComparatorOp} op
 * @property {string} field
 * @property {*} value
 */

/**
 * @typedef {Object} GroupCondition
 * @property {"and"|"or"} op
 * @property {Condition[]} args
 */

/**
 * @typedef {Object} NotCondition
 * @property {"not"} op
 * @property {Condition} arg
 */

/**
 * @typedef {ComparisonCondition | GroupCondition | NotCondition} Condition
 */

/**
 * @typedef {Object} Rule
 * @property {string} ruleId
 * @property {string} name
 * @property {number} priority - Entero >= 1, único dentro de su grupo
 * @property {Condition} when
 * @property {DocumentAction|LineAction} then
 */

/**
 * @typedef {Object} TestExpectedLine
 * @property {"D"|"H"} side
 * @property {string} accountCode
 * @property {string|null} [costCenter]
 * @property {number} functionalAmountCents
 */

/**
 * @typedef {Object} TestCase
 * @property {string} caseId
 * @property {string} name
 * @property {Object} document
 * @property {TestExpectedLine[]} expectedLines
 */

/**
 * @typedef {Object} TestCaseResult
 * @property {string} caseId
 * @property {boolean} passed
 * @property {boolean} balanced
 * @property {Array<{accountCode: string, problem: "NOT_FOUND"|"NOT_POSTABLE"}>} accountErrors
 * @property {string[]} appliedRuleIds
 * @property {Array<{side: "D"|"H", accountCode: string, costCenter: string|null, functionalAmountCents: number}>} actualLines
 */

/**
 * @typedef {Object} TestRunResult
 * @property {string} at
 * @property {string} by
 * @property {boolean} allPassed
 * @property {string[]} uncoveredRuleIds
 * @property {TestCaseResult[]} results
 */

/**
 * @typedef {"DRAFT"|"ACTIVE"|"RETIRED"} TemplateVersionStatus
 */

/**
 * @typedef {Object} TemplateVersion
 * @property {number} version
 * @property {TemplateVersionStatus} status
 * @property {number|null} basedOnVersion
 * @property {TemplateDefaults} defaults
 * @property {Rule[]} documentRules
 * @property {Rule[]} lineRules
 * @property {TestCase[]} testCases
 * @property {TestRunResult|null} lastTestRun
 * @property {string} createdBy
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string|null} [activatedBy]
 * @property {string|null} [activatedAt]
 * @property {string[]|null} [diffFromPrevious]
 * @property {number} usageCount
 */

/**
 * @typedef {Object} Template
 * @property {string} templateId
 * @property {string} code
 * @property {string} name
 * @property {"COMPRA"|"VENTA"} operationType
 * @property {string} createdBy
 * @property {string} createdAt
 * @property {string|null} retiredAt
 * @property {TemplateVersion[]} versions
 */

/**
 * @typedef {Object} TemplateActivation
 * @property {string} templateId
 * @property {boolean} active
 * @property {string} activatedBy
 * @property {string} activatedAt
 * @property {Array<{accountCode: string, problem: "NOT_FOUND"|"NOT_POSTABLE"}>} accountWarnings
 */
