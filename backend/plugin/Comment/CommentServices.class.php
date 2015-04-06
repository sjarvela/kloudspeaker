<?php

/**
 * CommentServices.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class CommentServices extends ServicesBase {
	protected function isValidPath($method, $path) {
		return TRUE;
	}

	public function isAuthenticationRequired() {
		return TRUE;
	}

	public function processGet() {
		if (count($this->path) != 1) {
			throw $this->invalidRequestException();
		}

		$item = $this->item($this->path[0]);
		$comments = $this->handler()->getComments($item);
		$permission = $this->env->request()->hasParamValue("p", "1");

		if (!$permission) {
			$this->response()->success($comments);
		} else {
			$this->response()->success(array(
				"comments" => $comments,
				"permission" => $this->env->permissions()->getFilesystemPermission("comment_item", $item),
			));
		}
	}

	public function processPost() {
		if (count($this->path) != 1) {
			throw $this->invalidRequestException();
		}

		if (count($this->path) == 1 and $this->path[0] === 'query') {
			$this->response()->success($this->handler()->processQuery($this->request->data));
			return;
		}

		$item = $this->item($this->path[0]);
		$data = $this->request->data;
		if (!isset($data["comment"]) or strlen($data["comment"]) == 0) {
			throw $this->invalidRequestException("No data");
		}

		$this->handler()->addComment($this->env->session()->userId(), $item, $data["comment"]);
		$this->response()->success(array("count" => $this->handler()->getCommentCount($item)));
	}

	public function processDelete() {
		if (count($this->path) != 2) {
			throw $this->invalidRequestException();
		}

		$item = $this->item($this->path[0]);
		$id = $this->path[1];

		$this->handler()->removeComment($item, $id);
		$this->response()->success($this->handler()->getComments($item));
	}

	private function handler() {
		return $this->env->plugins()->getPlugin("Comment")->getHandler();
	}
}
?>