<?php
namespace Kloudspeaker\Plugins\Comment;

require 'CommentRepository.php';

class CommentPlugin extends \Kloudspeaker\Plugins\AbstractPlugin {
	public function __construct($container, $config) {
		parent::__construct($container);
		$this->repository = new CommentRepository($container);
	}

	public function initialize($setup) {
		$this->container->permissions->registerFilesystemPermission("comment_item");

		$this->container->filesystem->registerDataRequestPlugin("plugin-comment-count", function ($parent, $items, $key, $rq) {
			if ($parent != NULL) {
				return $this->repository->getCommentCountForChildren($parent);
			}

			//not under same parent, get comment count for each item separately
			return $this->repository->getCommentCountForItems($items);
		});
	}

	public function getPluginInfo() {
		$t = $this;
		return array_merge(parent::getPluginInfo(), [
			"id" => "comment",
			"client_module" => "kloudspeaker/plugins/comment",
			"db" => TRUE,
			"api" => function ($route) use ($t) {
				$route->get("/items/{item}/comments", function ($request, $response, $args) use ($t) {
					$item = $t->item($args['item']);
					$result = ["comments" => $t->repository->getAllCommentsForItem($item)];
					if ("1" == $request->getParam("p")) {
						$result["permissions"] = ["add" => $this->permissions->hasFilesystemPermission("comment_item", $item)];
					}

					$this->out->success($result);
				});
				$route->post("/items/{item}/comments", function ($request, $response, $args) use ($t) {
					$item = $t->item($args['item']);
					$data = $request->getParsedBody();
					if ($data == NULL or !isset($data["comment"]) or strlen($data["comment"]) == 0) {
						throw new \Kloudspeaker\KloudspeakerException("Comment missing");
					}
					$t->assertFilesystemPermission($item, "comment_item");

					$t->repository->addCommentForItem($item, $this->session->getUser()["id"], $this->now, $data["comment"]);
					$this->out->success(["count" => $t->repository->getCommentCountForItem($item)]);
				});
			},
		]);
	}
}