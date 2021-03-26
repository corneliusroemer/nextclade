#include "treePostprocess.h"

#include "Tree.h"
#include "TreeNode.h"

namespace Nextclade {
  class Tree;

  void treePostprocessInPlaceRecursive(TreeNode& node) {
    // Remove temporary data that was added during preprocessing step.
    node.removeTemporaries();

    // Repeat for children recursively
    auto children = node.children();
    children.forEach(treePostprocessInPlaceRecursive);
  }

  void treePostprocess(Tree& tree) {
    auto root = tree.root();
    treePostprocessInPlaceRecursive(root);

    // TODO: also port colorings and display_defaults
  }
}// namespace Nextclade
