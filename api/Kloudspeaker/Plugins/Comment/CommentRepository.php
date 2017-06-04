<?php
namespace Kloudspeaker\Plugins\Comment;

class CommentRepository {
	public function __construct($container) {
		$this->container = $container;
		$this->db = $container->db;
	}

	public function getCommentCount($item) {
		return $this->db->select('comment', ['count(id)'])->where('item_id', $item->id())->execute()->value(0);
	}

	public function getCommentCountForChildren($parent) {
		$q = $this->db->select('comment', ['item_id', 'count(id) as count'])->groupBy('item_id');
		$this->container->itemIdProvider->addFilter($q->whereInSelect("item_id"), $parent);
		return $q->execute()->map("item_id", "count");
		//$db = $this->env->db();
		/*$pathFilter = $this->env->filesystem()->itemIdProvider()->pathQueryFilter($parent, FALSE, NULL);
		$itemFilter = "select id from " . $db->table("item_id") . " where " . $pathFilter;
		return $db->query("select item_id, count(id) as count from " . $db->table("comment") . " where item_id in (" . $itemFilter . ") group by item_id")->valueMap("item_id", "count");*/
		return [];
	}

	public function getCommentCountForItems($items) {
		$ids = \Kloudspeaker\Utils::extract($items, "id");
		return $this->db->select('comment', ['item_id', 'count(id) as count'])->whereIn('item_id', $ids)->groupBy('item_id')->execute()->map("item_id", "count");
		/*$ids = array();
				foreach ($items as $i) {
					$ids[] = $i->id();
				}

				$db = $this->env->db();
			$db = $this->env->db();
			return $db->query("select item_id, count(`id`) as count from " . $db->table("comment") . " where item_id in (" . $db->arrayString($ids, TRUE) . ") group by item_id")->valueMap("item_id", "count");
		*/
		return [];
	}

	public function getAllCommentsForItem($item) {
		return $this->db->select('comment c', ['c.id as id', 'u.id as userid', 'u.name as username', 'c.time as time', 'c.comment as comment'])->types(["time" => \Kloudspeaker\Database\Database::TYPE_DATETIME])->leftJoin('user u', 'c.user_id = u.id')->where('c.item_id', $item->id())->done()->orderBy('time', FALSE)->execute()->rows();

		/*$db = $this->env->db();
		return $db->query("select c.id as id, u.id as user_id, u.name as username, c.time as time, c.comment as comment from " . $db->table("comment") . " c, " . $db->table("user") . " u where c.`item_id` = " . $db->string($item->id(), TRUE) . " and u.id = c.user_id order by time desc")->rows();*/
	}
}