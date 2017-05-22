<?php
namespace Kloudspeaker\Plugins\Comment;

require 'CommentRepository.php';

class CommentPlugin extends \Kloudspeaker\Plugins\AbstractPlugin {
	public function __construct($container, $config) {
		parent::__construct($container);
		$this->repository = new CommentRepository($container);
	}

	public function initialize($setup) {
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
				$route->get("/test", function ($request, $response, $args) use ($t) {
					$this->out->success("test result");
				});
			},
		]);
	}
}