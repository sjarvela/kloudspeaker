<?php
	class TextFileViewer extends FullDocumentViewer {
		static $scripts = array(
			"as3" => "shBrushAS3.js",
			"bash" => "shBrushBash.js",
			"cf" => "shBrushColdFusion.js",
			"csharp" =>	"shBrushCSharp.js",
			"c" => "shBrushCpp.js",
			"css" => "shBrushCss.js",
			"pascal" => "shBrushDelphi.js",
			"diff" => "shBrushDiff.js",
			"erl" => "shBrushErlang.js",
			"groovy" => "shBrushGroovy.js",
			"js" => "shBrushJScript.js",
			"java" => "shBrushJava.js",
			"jfx" => "shBrushJavaFX.js",
			"perl" => "shBrushPerl.js",
			"php" => "shBrushPhp.js",
			"plain" => "shBrushPlain.js",
			"ps" => "shBrushPowerShell.js",
			"py" =>	"shBrushPython.js",
			"rails" => "shBrushRuby.js",
			"scala" => "shBrushScala.js",
			"sql" => "shBrushSql.js",
			"vb" => "shBrushVb.js",
			"xml" => "shBrushXml.js"
		);
		
		protected function getHtml($item, $full) {
			$resourceUrl = $this->getResourceUrl();
			$syntax = $this->getSyntax($item);
			$settings = $this->getSettings();
			
			$theme = "shThemeDefault.css";
			if (isset($settings["style"])) $theme = $settings["style"];
			
			$head = '<script type="text/javascript" src="'.$resourceUrl.'shCore.js"></script>'.
					'<script type="text/javascript" src="'.$resourceUrl.self::$scripts[$syntax].'"></script>'.
					'<link type="text/css" rel="stylesheet" href="'.$resourceUrl.'/styles/shCore.css" />'.
					'<link type="text/css" rel="stylesheet" href="'.$resourceUrl.'/styles/'.$theme.'"/>';
					
			$html = '<script type="syntaxhighlighter" class="brush: '.$syntax.'"><![CDATA[';

			// read file
			$stream = $this->getItemContent($item);
			while (!feof($stream))
				$html .= htmlspecialchars(fread($stream, 1024));
			fclose($stream);

			$html .= ']]></script><script type="text/javascript">SyntaxHighlighter.all()</script>';
			
			return "<html><head><title>".(is_array($item) ? $item["name"] : $item->name())."</title>".$head."</head><body>".$html."</body></html>";
		}
		
		private function getSyntax($item) {
			$ext = (is_array($item) ? $item["extension"] : $item->extension());
			
			if ($ext === 'as3') return "as3";
			if ($ext === 'js') return "js";
			if ($ext === 'php') return "php";
			if ($ext === 'css') return "css";
			if ($ext === 'sh') return "bash";
			if ($ext === 'cpp' or $ext === 'c') return "c";
			if ($ext === 'java') return "java";
			if ($ext === 'sql') return "sql";
			if ($ext === 'xml' or $ext === 'xhtml' or $ext === 'xslt' or $ext === 'html') return "xml";
			if ($ext === 'py') return "py";
			
			// fallback to plain format
			return "plain";
		}
	}
?>