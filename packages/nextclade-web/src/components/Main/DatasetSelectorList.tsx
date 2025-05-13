import React, { forwardRef, useCallback, useMemo, useRef } from 'react'
import { ListGroup } from 'reactstrap'
import styled from 'styled-components'
import { areDatasetsEqual, attrStrMaybe, Dataset } from 'src/types'
import { ListGenericCss } from 'src/components/Common/List'
import { search } from 'src/helpers/search'
import { DatasetListEntry } from 'src/components/Main/DatasetListEntry'

export interface DatasetSelectorListProps {
  datasetsActive: Dataset[]
  datasetsInactive?: Dataset[]
  datasetHighlighted?: Dataset
  onDatasetHighlighted?(dataset?: Dataset): void
  searchTerm: string
}

export function DatasetSelectorList({
  datasetsActive,
  datasetsInactive = [],
  datasetHighlighted,
  onDatasetHighlighted,
  searchTerm,
}: DatasetSelectorListProps) {
  const onItemClick = useCallback((dataset: Dataset) => () => onDatasetHighlighted?.(dataset), [onDatasetHighlighted])

  const listItemsRef = useScrollListToDataset(datasetHighlighted)

  const searchResult = useMemo(() => {
    if (searchTerm.trim().length === 0) {
      return { itemsStartWith: [], itemsInclude: datasetsActive, itemsNotInclude: datasetsInactive }
    }

    return search([...datasetsActive, ...datasetsInactive], searchTerm, (dataset) => [
      dataset.path,
      attrStrMaybe(dataset.attributes, 'name') ?? '',
      attrStrMaybe(dataset.attributes, 'reference name') ?? '',
      attrStrMaybe(dataset.attributes, 'reference accession') ?? '',
      ...(dataset.shortcuts ?? []),
    ])
  }, [datasetsActive, datasetsInactive, searchTerm])

  const { itemsStartWith, itemsInclude, itemsNotInclude } = searchResult

  return useMemo(
    () => (
      <Ul>
        {[...itemsStartWith, ...itemsInclude].map((dataset) => (
          <DatasetSelectorListItem
            key={dataset.path}
            ref={nodeRefSetOrDelete(listItemsRef.current, dataset.path)}
            dataset={dataset}
            onClick={onItemClick(dataset)}
            isCurrent={areDatasetsEqual(dataset, datasetHighlighted)}
          />
        ))}

        {itemsNotInclude.map((dataset) => (
          <DatasetSelectorListItem
            key={dataset.path}
            ref={nodeRefSetOrDelete(listItemsRef.current, dataset.path)}
            dataset={dataset}
            onClick={onItemClick(dataset)}
            isCurrent={areDatasetsEqual(dataset, datasetHighlighted)}
            isDimmed
          />
        ))}
      </Ul>
    ),
    [datasetHighlighted, itemsInclude, itemsNotInclude, itemsStartWith, listItemsRef, onItemClick],
  )
}

function nodeRefSetOrDelete<T extends HTMLElement>(map: Map<string, T>, key: string) {
  return function nodeRefSetOrDeleteImpl(node: T) {
    if (node) {
      map.set(key, node)
    } else {
      map.delete(key)
    }
  }
}

function useScrollListToDataset(datasetHighlighted?: Dataset) {
  const itemsRef = useRef<Map<string, HTMLLIElement>>(new Map())

  const scrollToId = useCallback((itemId: string) => {
    const node = itemsRef.current.get(itemId)
    node?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [])

  if (datasetHighlighted) {
    scrollToId(datasetHighlighted.path)
  }

  return itemsRef
}

export const Ul = styled(ListGroup)`
  ${ListGenericCss};
  flex: 1;
  overflow: auto;
  padding: 5px 5px;
  border-radius: 0 !important;
`

export const Li = styled.li<{ $active?: boolean; $isDimmed?: boolean }>`
  display: flex;

  cursor: pointer;
  opacity: ${(props) => props.$isDimmed && 0.4};
  background-color: transparent;

  margin: 3px 3px !important;
  padding: 0 !important;
  border-radius: 5px !important;

  ${(props) =>
    props.$active &&
    `
    color: ${props.theme.white};
    background-color: ${props.theme.primary};
    color: ${props.theme.gray100};
    box-shadow: -3px 3px 12px 3px #0005;
    opacity: ${props.$isDimmed && 0.66};
    `};
`

interface DatasetSelectorListItemProps {
  dataset: Dataset
  isCurrent?: boolean
  isDimmed?: boolean
  onClick?: () => void
}

const DatasetSelectorListItem = forwardRef<HTMLLIElement, DatasetSelectorListItemProps>(
  function DatasetSelectorListItemWithRef({ dataset, isCurrent, isDimmed, onClick }, ref) {
    return (
      <Li ref={ref} $isDimmed={isDimmed} aria-current={isCurrent} $active={isCurrent} onClick={onClick}>
        <DatasetListEntry dataset={dataset} />
      </Li>
    )
  },
)
