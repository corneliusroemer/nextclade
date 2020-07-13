import React, { memo } from 'react'

import { sum } from 'lodash'
import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { areEqual, FixedSizeList, ListChildComponentProps } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import styled from 'styled-components'
import { rgba } from 'polished'

import type { State } from 'src/state/reducer'
import type { SequenceAnylysisState } from 'src/state/algorithm/algorithm.state'
import type { Sorting } from 'src/helpers/resultsSort'
import { SortCategory, SortDirection } from 'src/helpers/resultsSort'
import { resultsSortTrigger } from 'src/state/algorithm/algorithm.actions'

import { SequenceView } from 'src/components/SequenceView/SequenceView'

import { ColumnName } from './ColumnName'
import { ColumnQCStatus } from './ColumnQCStatus'
import { ColumnClade } from './ColumnClade'
import { ColumnMutations } from './ColumnMutations'
import { ColumnNonACGTNs } from './ColumnNonACGTNs'
import { ColumnMissing } from './ColumnMissing'
import { ColumnGaps } from './ColumnGaps'
import { ResultsControlsSort } from './ResultsControlsSort'

const ROW_HEIGHT = 30
const HEADER_ROW_HEIGHT = 60

// TODO: This should be passed through the theme context to styled-components
export const RESULTS_TABLE_FLEX_BASIS = {
  id: 50,
  seqName: 300,
  qc: 60,
  clade: 60,
  mut: 60,
  nonACGTN: 70,
  ns: 60,
  gaps: 60,
} as const

export const RESULTS_TABLE_FLEX_BASIS_PX = Object.fromEntries(
  Object.entries(RESULTS_TABLE_FLEX_BASIS).map(([item, fb]) => [item, `${fb}px`]),
) as Record<keyof typeof RESULTS_TABLE_FLEX_BASIS, string>

export const geneMapNameBasis = sum(Object.values(RESULTS_TABLE_FLEX_BASIS))
export const geneMapNameBasisPx = `${geneMapNameBasis}px`

export const Table = styled.div<{ rounded?: boolean }>`
  font-size: 0.8rem;
  width: 100%;
  height: 100%;
  background-color: #b3b3b3aa;
  overflow: hidden;
  border-radius: ${(props) => props.rounded && '3px'};
  transition: border-radius 250ms linear;
`

export const TableHeaderRow = styled.div`
  display: flex;
  align-items: stretch;
  height: ${HEADER_ROW_HEIGHT}px;
  overflow-y: scroll;
  background-color: #495057;
  color: #e7e7e7;
`

export const TableHeaderCell = styled.div<{ basis?: string; grow?: number; shrink?: number; first?: boolean }>`
  flex-basis: ${(props) => props?.basis};
  flex-grow: ${(props) => props?.grow};
  flex-shrink: ${(props) => props?.shrink};
  border-left: ${(props) => !props.first && `1px solid #b3b3b3aa`};
  overflow: hidden;
  width: 100%;
  height: 100%;
  display: flex;
`

export const TableCellText = styled.p`
  text-align: center;
  margin: auto;
`

export const TableRow = styled.div<{ even?: boolean }>`
  display: flex;
  align-items: stretch;
  background-color: ${(props) => (props.even ? '#e2e2e2' : '#fcfcfc')};
  box-shadow: 1px 2px 2px 2px ${rgba('#212529', 0.25)};
`

export const TableCell = styled.div<{ basis?: string; grow?: number; shrink?: number }>`
  flex-basis: ${(props) => props?.basis};
  flex-grow: ${(props) => props?.grow};
  flex-shrink: ${(props) => props?.shrink};
  overflow: hidden;
  display: flex;
  align-items: center;
  text-align: center;
  border-left: 1px solid #b3b3b3;
  height: 100%;
`

export const TableCellName = styled(TableCell)<{ basis?: string; grow?: number; shrink?: number }>`
  text-align: left;
  padding-left: 5px;
`

export const TableRowPending = styled(TableRow)`
  background-color: #d2d2d2;
  color: #818181;
`

export const TableRowError = styled(TableRow)`
  background-color: #f5cbc6;
  color: #962d26;
`

export interface RowProps extends ListChildComponentProps {
  data: SequenceAnylysisState[]
}

function TableRowComponent({ index, style, data }: RowProps) {
  const { t } = useTranslation()

  const { id, seqName, errors, result: sequence } = data[index]

  if (errors.length > 0) {
    return (
      <TableRowError style={style} even={index % 2 === 0}>
        <TableCell basis={RESULTS_TABLE_FLEX_BASIS_PX.id} grow={0} shrink={0}>
          <TableCellText>{id}</TableCellText>
        </TableCell>

        <TableCellName basis={RESULTS_TABLE_FLEX_BASIS_PX.seqName} shrink={0}>
          <ColumnName seqName={seqName} sequence={sequence} />
        </TableCellName>

        <TableCell grow={20} shrink={20}>
          <TableCellText>{errors}</TableCellText>
        </TableCell>
      </TableRowError>
    )
  }

  if (!sequence) {
    return (
      <TableRowPending style={style} even={index % 2 === 0}>
        <TableCell basis={RESULTS_TABLE_FLEX_BASIS_PX.id} grow={0} shrink={0}>
          <TableCellText>{id}</TableCellText>
        </TableCell>

        <TableCellName basis={RESULTS_TABLE_FLEX_BASIS_PX.seqName} shrink={0}>
          <ColumnName seqName={seqName} sequence={sequence} />
        </TableCellName>

        <TableCell grow={20} shrink={20}>
          <TableCellText>{t('Analyzing...')}</TableCellText>
        </TableCell>
      </TableRowPending>
    )
  }

  return (
    <TableRow style={style} even={index % 2 === 0}>
      <TableCell basis={RESULTS_TABLE_FLEX_BASIS_PX.id} grow={0} shrink={0}>
        <TableCellText>{id}</TableCellText>
      </TableCell>

      <TableCellName basis={RESULTS_TABLE_FLEX_BASIS_PX.seqName} shrink={0}>
        <ColumnName seqName={seqName} sequence={sequence} />
      </TableCellName>

      <TableCell basis={RESULTS_TABLE_FLEX_BASIS_PX.qc} grow={0} shrink={0}>
        <ColumnQCStatus sequence={sequence} />
      </TableCell>

      <TableCell basis={RESULTS_TABLE_FLEX_BASIS_PX.clade} grow={0} shrink={0}>
        <ColumnClade sequence={sequence} />
      </TableCell>

      <TableCell basis={RESULTS_TABLE_FLEX_BASIS_PX.mut} grow={0} shrink={0}>
        <ColumnMutations sequence={sequence} />
      </TableCell>

      <TableCell basis={RESULTS_TABLE_FLEX_BASIS_PX.nonACGTN} grow={0} shrink={0}>
        <ColumnNonACGTNs sequence={sequence} />
      </TableCell>

      <TableCell basis={RESULTS_TABLE_FLEX_BASIS_PX.ns} grow={0} shrink={0}>
        <ColumnMissing sequence={sequence} />
      </TableCell>

      <TableCell basis={RESULTS_TABLE_FLEX_BASIS_PX.gaps} grow={0} shrink={0}>
        <ColumnGaps sequence={sequence} />
      </TableCell>

      <TableCell grow={20} shrink={20}>
        <SequenceView key={seqName} sequence={sequence} />
      </TableCell>
    </TableRow>
  )
}

const TableRowMemo = memo(TableRowComponent, areEqual)

const mapStateToProps = (state: State) => ({
  resultsFiltered: state.algorithm.resultsFiltered,
  filterPanelCollapsed: state.ui.filterPanelCollapsed,
})

const mapDispatchToProps = {
  resultsSortTrigger: (sorting: Sorting) => resultsSortTrigger(sorting),

  sortByIdAsc: () => resultsSortTrigger({ category: SortCategory.id, direction: SortDirection.asc }),
  sortByIdDesc: () => resultsSortTrigger({ category: SortCategory.id, direction: SortDirection.desc }),

  sortByNameAsc: () => resultsSortTrigger({ category: SortCategory.seqName, direction: SortDirection.asc }),
  sortByNameDesc: () => resultsSortTrigger({ category: SortCategory.seqName, direction: SortDirection.desc }),

  sortByQcIssuesAsc: () => resultsSortTrigger({ category: SortCategory.qcIssues, direction: SortDirection.asc }),
  sortByQcIssuesDesc: () => resultsSortTrigger({ category: SortCategory.qcIssues, direction: SortDirection.desc }),

  sortByCladeAsc: () => resultsSortTrigger({ category: SortCategory.clade, direction: SortDirection.asc }),
  sortByCladeDesc: () => resultsSortTrigger({ category: SortCategory.clade, direction: SortDirection.desc }),

  sortByTotalMutationsAsc: () => resultsSortTrigger({ category: SortCategory.totalMutations, direction: SortDirection.asc }), // prettier-ignore
  sortByTotalMutationsDesc: () => resultsSortTrigger({ category: SortCategory.totalMutations, direction: SortDirection.desc }), // prettier-ignore

  sortByTotalNonAcgtnAsc: () => resultsSortTrigger({ category: SortCategory.totalNonACGTNs, direction: SortDirection.asc }), // prettier-ignore
  sortByTotalNonAcgtnDesc: () => resultsSortTrigger({ category: SortCategory.totalNonACGTNs, direction: SortDirection.desc }), // prettier-ignore

  sortByTotalNsAsc: () => resultsSortTrigger({ category: SortCategory.totalMissing, direction: SortDirection.asc }),
  sortByTotalNsDesc: () => resultsSortTrigger({ category: SortCategory.totalMissing, direction: SortDirection.desc }),

  sortByTotalGapsAsc: () => resultsSortTrigger({ category: SortCategory.totalGaps, direction: SortDirection.asc }),
  sortByTotalGapsDesc: () => resultsSortTrigger({ category: SortCategory.totalGaps, direction: SortDirection.desc }),
}

export const ResultsTable = connect(mapStateToProps, mapDispatchToProps)(ResultsTableDisconnected)

export interface ResultProps {
  resultsFiltered: SequenceAnylysisState[]
  filterPanelCollapsed: boolean
  sortByIdAsc(): void
  sortByIdDesc(): void
  sortByNameAsc(): void
  sortByNameDesc(): void
  sortByQcIssuesAsc(): void
  sortByQcIssuesDesc(): void
  sortByCladeAsc(): void
  sortByCladeDesc(): void
  sortByTotalMutationsAsc(): void
  sortByTotalMutationsDesc(): void
  sortByTotalNonAcgtnAsc(): void
  sortByTotalNonAcgtnDesc(): void
  sortByTotalNsAsc(): void
  sortByTotalNsDesc(): void
  sortByTotalGapsAsc(): void
  sortByTotalGapsDesc(): void
}

export function ResultsTableDisconnected({
  resultsFiltered,
  filterPanelCollapsed,
  sortByIdAsc,
  sortByIdDesc,
  sortByNameAsc,
  sortByNameDesc,
  sortByQcIssuesAsc,
  sortByQcIssuesDesc,
  sortByCladeAsc,
  sortByCladeDesc,
  sortByTotalMutationsAsc,
  sortByTotalMutationsDesc,
  sortByTotalNonAcgtnAsc,
  sortByTotalNonAcgtnDesc,
  sortByTotalNsAsc,
  sortByTotalNsDesc,
  sortByTotalGapsAsc,
  sortByTotalGapsDesc,
}: ResultProps) {
  const { t } = useTranslation()

  const data = resultsFiltered

  return (
    <>
      <Table rounded={!filterPanelCollapsed}>
        <TableHeaderRow>
          <TableHeaderCell first basis={RESULTS_TABLE_FLEX_BASIS_PX.id} grow={0} shrink={0}>
            <TableCellText>{t('ID')}</TableCellText>
            <ResultsControlsSort sortAsc={sortByIdAsc} sortDesc={sortByIdDesc} />
          </TableHeaderCell>

          <TableHeaderCell basis={RESULTS_TABLE_FLEX_BASIS_PX.seqName} shrink={0}>
            <TableCellText>{t('Sequence name')}</TableCellText>
            <ResultsControlsSort sortAsc={sortByNameAsc} sortDesc={sortByNameDesc} />
          </TableHeaderCell>

          <TableHeaderCell basis={RESULTS_TABLE_FLEX_BASIS_PX.qc} grow={0} shrink={0}>
            <TableCellText>{t('QC')}</TableCellText>
            <ResultsControlsSort sortAsc={sortByQcIssuesAsc} sortDesc={sortByQcIssuesDesc} />
          </TableHeaderCell>

          <TableHeaderCell basis={RESULTS_TABLE_FLEX_BASIS_PX.clade} grow={0} shrink={0}>
            <TableCellText>{t('Clade')}</TableCellText>
            <ResultsControlsSort sortAsc={sortByCladeAsc} sortDesc={sortByCladeDesc} />
          </TableHeaderCell>

          <TableHeaderCell basis={RESULTS_TABLE_FLEX_BASIS_PX.mut} grow={0} shrink={0}>
            <TableCellText>{t('Mut.')}</TableCellText>
            <ResultsControlsSort sortAsc={sortByTotalMutationsAsc} sortDesc={sortByTotalMutationsDesc} />
          </TableHeaderCell>

          <TableHeaderCell basis={RESULTS_TABLE_FLEX_BASIS_PX.nonACGTN} grow={0} shrink={0}>
            <TableCellText>{t('non-ACGTN')}</TableCellText>
            <ResultsControlsSort sortAsc={sortByTotalNonAcgtnAsc} sortDesc={sortByTotalNonAcgtnDesc} />
          </TableHeaderCell>

          <TableHeaderCell basis={RESULTS_TABLE_FLEX_BASIS_PX.ns} grow={0} shrink={0}>
            <TableCellText>{t('Ns')}</TableCellText>
            <ResultsControlsSort sortAsc={sortByTotalNsAsc} sortDesc={sortByTotalNsDesc} />
          </TableHeaderCell>

          <TableHeaderCell basis={RESULTS_TABLE_FLEX_BASIS_PX.gaps} grow={0} shrink={0}>
            <TableCellText>{t('Gaps')}</TableCellText>
            <ResultsControlsSort sortAsc={sortByTotalGapsAsc} sortDesc={sortByTotalGapsDesc} />
          </TableHeaderCell>

          <TableHeaderCell grow={20}>
            <TableCellText>{t('Sequence')}</TableCellText>
          </TableHeaderCell>
        </TableHeaderRow>

        <AutoSizer>
          {({ width, height }) => {
            return (
              <FixedSizeList
                overscanCount={10}
                style={{ overflowY: 'scroll' }}
                width={width}
                height={height - HEADER_ROW_HEIGHT}
                itemCount={data.length}
                itemSize={ROW_HEIGHT}
                itemData={data}
              >
                {TableRowMemo}
              </FixedSizeList>
            )
          }}
        </AutoSizer>
      </Table>
    </>
  )
}
