import 'regenerator-runtime'

import type { CladeNodeAttrDesc } from 'auspice'
import { AnalysisInitialData, AuspiceRefNodesDesc, OutputTrees } from 'src/types'
import type { Thread } from 'threads'
import { expose } from 'threads/worker'
import { Observable as ThreadsObservable, Subject } from 'threads/observable'

import type {
  AaMotifsDesc,
  AnalysisError,
  AnalysisResult,
  CsvColumnConfig,
  FastaRecord,
  NextcladeParamsRaw,
  NextcladeResult,
  PhenotypeAttrDesc,
} from 'src/types'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { prepareGeneMap } from 'src/io/prepareGeneMap'
import { NextcladeWasm } from 'src/gen/nextclade-wasm'

const gSubject = new Subject<FastaRecord>()

function onSequence(seq: FastaRecord) {
  gSubject.next(seq)
}

function onComplete() {
  gSubject.complete()
}

function onError(error: Error) {
  gSubject.error(error)
}

export class ErrorModuleNotInitialized extends ErrorInternal {
  constructor(fnName: string) {
    super(
      `This WebWorker module has not been initialized yet. When calling module.${fnName} Make sure to call 'module.create()' function.`,
    )
  }
}

export class ErrorBothResultsAndErrorAreNull extends ErrorInternal {
  constructor() {
    super(`Both the 'results' and 'error' returned from the analysis wasm module are 'null'. This should never happen.`)
  }
}

/**
 * Keeps the reference to the WebAssembly module.The module is stateful and requires manual initialization
 * and teardown.
 * This cloud be a class instance, but unfortunately we cannot pass classes to/from WebWorkers (yet?).
 */
let nextcladeWasm: NextcladeWasm | undefined

/** Creates the underlying WebAssembly module. */
async function create(params: NextcladeParamsRaw) {
  nextcladeWasm = NextcladeWasm.new(JSON.stringify(params))
}

/** Destroys the underlying WebAssembly module. */
async function destroy() {
  if (!nextcladeWasm) {
    return
  }

  nextcladeWasm.free()
  nextcladeWasm = undefined
}

async function getInitialData(datasetName: string): Promise<AnalysisInitialData> {
  if (!nextcladeWasm) {
    throw new ErrorModuleNotInitialized('getInitialData')
  }
  const initialDataStr = nextcladeWasm.get_initial_data(datasetName)
  const initialData = JSON.parse(initialDataStr) as AnalysisInitialData
  return {
    ...initialData,
    geneMap: prepareGeneMap(initialData.geneMap),
  }
}

/** Runs the underlying WebAssembly module. */
async function analyze(datasetName: string, record: FastaRecord): Promise<NextcladeResult> {
  if (!nextcladeWasm) {
    throw new ErrorModuleNotInitialized('analyze')
  }
  const input = JSON.stringify(record)
  const output = JSON.parse(nextcladeWasm.analyze(datasetName, input)) as NextcladeResult
  if (!output.result && !output.error) {
    throw new ErrorBothResultsAndErrorAreNull()
  }
  return output
}

/** Retrieves the output tree from the WebAssembly module. */
export async function getOutputTrees(
  datasetName: string,
  analysisResultsJsonStr: string,
): Promise<OutputTrees | undefined | null> {
  if (!nextcladeWasm) {
    throw new ErrorModuleNotInitialized('getOutputTrees')
  }
  return JSON.parse(nextcladeWasm.get_output_trees(datasetName, analysisResultsJsonStr))
}

export async function parseSequencesStreaming(fastaStr: string) {
  try {
    NextcladeWasm.parse_query_sequences(fastaStr, (index: number, seqName: string, seq: string) =>
      onSequence({ index: Number(index), seqName, seq }),
    )
  } catch (error: unknown) {
    onError(sanitizeError(error))
  }
  onComplete()
}

export async function parseRefSequence(refFastaStr: string) {
  return NextcladeWasm.parse_ref_seq_fasta(refFastaStr)
}

export async function serializeResultsJson(
  outputs: AnalysisResult[],
  errors: AnalysisError[],
  cladeNodeAttrsJson: CladeNodeAttrDesc[],
  phenotypeAttrsJson: PhenotypeAttrDesc[],
  refNodes: AuspiceRefNodesDesc,
  nextcladeWebVersion: string,
) {
  return NextcladeWasm.serialize_results_json(
    JSON.stringify(outputs),
    JSON.stringify(errors),
    JSON.stringify(cladeNodeAttrsJson),
    JSON.stringify(phenotypeAttrsJson),
    JSON.stringify(refNodes),
    nextcladeWebVersion,
  )
}

export async function serializeResultsNdjson(results: AnalysisResult[], errors: AnalysisError[]) {
  return NextcladeWasm.serialize_results_ndjson(JSON.stringify(results), JSON.stringify(errors))
}

export async function serializeResultsCsv(
  results: AnalysisResult[],
  errors: AnalysisError[],
  cladeNodeAttrsJson: CladeNodeAttrDesc[],
  phenotypeAttrsJson: PhenotypeAttrDesc[],
  refNodesJson: AuspiceRefNodesDesc,
  aaMotifsDescs: AaMotifsDesc[],
  delimiter: string,
  csvColumnConfig: CsvColumnConfig,
) {
  return NextcladeWasm.serialize_results_csv(
    JSON.stringify(results),
    JSON.stringify(errors),
    JSON.stringify(cladeNodeAttrsJson),
    JSON.stringify(phenotypeAttrsJson),
    JSON.stringify(refNodesJson),
    JSON.stringify(aaMotifsDescs),
    delimiter,
    JSON.stringify(csvColumnConfig),
  )
}

export async function serializeResultsExcel(
  results: AnalysisResult[],
  errors: AnalysisError[],
  allInitialData: Map<string, AnalysisInitialData>,
  csvColumnConfig: CsvColumnConfig,
  datasetNameToSeqIndices: Map<string, number[]>,
  seqIndicesWithoutDatasetSuggestions: number[],
) {
  return NextcladeWasm.serialize_results_excel(
    JSON.stringify(results),
    JSON.stringify(errors),
    JSON.stringify(Object.fromEntries(allInitialData)),
    JSON.stringify(csvColumnConfig),
    JSON.stringify(Object.fromEntries(datasetNameToSeqIndices)),
    JSON.stringify(seqIndicesWithoutDatasetSuggestions),
  )
}

export async function serializeUnknownCsv(
  errors: AnalysisError[],
  seqIndicesWithoutDatasetSuggestions: number[],
  delimiter: string,
) {
  return NextcladeWasm.serialize_unknown_csv(
    JSON.stringify(errors),
    JSON.stringify(seqIndicesWithoutDatasetSuggestions),
    delimiter,
  )
}

export async function serializeResultsGff(results: AnalysisResult[]) {
  return NextcladeWasm.serialize_results_gff(JSON.stringify(results))
}

export async function serializeResultsTbl(results: AnalysisResult[]) {
  return NextcladeWasm.serialize_results_tbl(JSON.stringify(results))
}

const worker = {
  create,
  destroy,
  getInitialData,
  analyze,
  getOutputTrees,
  parseSequencesStreaming,
  parseRefSequence,
  serializeResultsJson,
  serializeResultsCsv,
  serializeResultsExcel,
  serializeResultsNdjson,
  serializeResultsGff,
  serializeResultsTbl,
  serializeUnknownCsv,
  values(): ThreadsObservable<FastaRecord> {
    return ThreadsObservable.from(gSubject)
  },
}

expose(worker)

export type NextcladeWasmWorker = typeof worker
export type NextcladeWasmThread = NextcladeWasmWorker & Thread
